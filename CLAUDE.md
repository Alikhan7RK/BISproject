# CLAUDE.md — NutriScan

Smart nutrition app with AI food photo recognition. Team final project for the
**Basics of Information Systems** course (KBTU, fall 2026). Two students, ~4 weeks.
The project is graded at an offline presentation + live demo, so **a working,
stable demo matters more than clever code**.

## What the app does

A user photographs a meal → our trained CNN recognizes the dish → the user confirms
it → calories and macros go into the daily log and are compared with a personal goal.
A nutritionist sees their clients' logs and writes recommendations. An admin manages
everything in the admin panel.

## Exam requirements (every change must keep these working)

| Requirement | Where it lives |
|---|---|
| 5+ functionalities | auth, profile + goal, AI recognition, meal log, dashboard, history, recommendations, nutritionist clients |
| Multilanguage (2+ languages, consistent UI) | `frontend/public/i18n/{en,ru,kk}.json` via ngx-translate; dish names `name_en/ru/kk` |
| Search over 2–3 entity types | `GET /api/search/?q=` → dishes, my meals, nutritionists; also `?search=` on lists |
| Admin panel: CRUD + role-based access | Django Admin (jazzmin theme) at `/admin/`; roles on `User.role` |
| 3+ actors | User, Nutritionist, Admin |
| ER diagram with 5+ entities, PK/FK | User, DishCategory, Dish, Meal, NutritionGoal, Recommendation |

**Every new UI string must be added to all three translation files** (en, ru, kk).
Never hardcode user-visible text in templates.

## Tech stack

- **Backend:** Django 6 + Django REST Framework, SimpleJWT auth, django-filter,
  django-cors-headers, jazzmin, SQLite (dev). Python 3.12+.
- **ML:** PyTorch + torchvision, ResNet-18 fine-tuned in Google Colab on 27 classes:
  20 from Food-101 + 7 local dishes from our own photos (plov, shashlik, beshbarmak, manty,
  lagman, baursak, blini). Django only runs predictions (CPU).
- **Frontend:** Angular 20, standalone components, signals, new control flow
  (`@if`, `@for`), ngx-translate, Chart.js. No NgModules.

## Project layout

```
backend/
  config/            settings.py (reads .env), urls.py
  accounts/          custom User (role, preferred_language, nutritionist FK), JWT auth, /api/auth/*
  nutrition/         DishCategory, Dish, Meal, NutritionGoal, Recommendation + API + admin
    management/commands/seed_demo.py   demo users + 27 dishes + meals
  ml/
    predictor.py     loads weights once (singleton), predict(image) -> top-3 labels
    views.py         POST /api/ml/recognize/, GET /api/ml/status/
    weights/         food_model.pth + classes.json (NOT in git)
    notebooks/train_food_model.ipynb   Colab training notebook
frontend/
  src/app/core/      models.ts (API types), api.service.ts (ALL HTTP calls), auth.*, language.service.ts
  src/app/pages/     one folder per page, single-file standalone components
  public/i18n/       en.json, ru.json, kk.json
docs/                prompts and notes
```

## How the ML part works (keep it this way)

1. Model is trained **only in Colab** (`backend/ml/notebooks/train_food_model.ipynb`).
2. Colab exports `food_model.pth` (state_dict) and `classes.json` → copied to `backend/ml/weights/`.
3. `FoodPredictor.get()` loads the model once per process; `torch` is imported lazily so the
   backend runs without torch installed (endpoint then returns 503 with a clear message).
4. `POST /api/ml/recognize/` returns top-3 `{label, confidence, dish}`; `dish` is matched by
   `Dish.ml_label`. **Nothing is saved there** — the frontend saves via `POST /api/meals/`
   after the user confirms.
5. **The architecture (`resnet18` + new `fc`) and the test preprocessing
   (Resize 224×224, ImageNet mean/std) must be identical in the notebook and `predictor.py`.**
   If you change one, change the other.
6. `CLASSES` in the notebook must match `Dish.ml_label` values in `seed_demo.py`.
   `CLASSES = FOOD101_CLASSES + CUSTOM_CLASSES` (20 + 7 = 27). `predictor.py` reads the number
   of classes from `classes.json`, so adding a class never needs a backend code change.
7. Our own photos are uploaded to Colab as `kz_food.zip` (NOT in git) with one folder per
   custom class: `kz_food/<class_name>/*.jpg`, folder names = `CUSTOM_CLASSES`, ~100–150 photos
   each. The notebook skips broken images, splits each class 80% train / 20% test with a fixed
   seed, and uses a `WeightedRandomSampler` so the small custom classes are seen as often as the
   750-image Food-101 classes.
8. To retrain: update `kz_food.zip` → run all notebook cells → replace `food_model.pth` and
   `classes.json` in `backend/ml/weights/` → `python manage.py seed_demo` → restart Django.
   New dish = new folder + name in `CUSTOM_CLASSES` + row in `seed_demo.py` with the same `ml_label`.

## Commands

```bash
# backend (from backend/)
python -m venv .venv && source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
pip install -r requirements-ml.txt                      # only for the AI feature
cp .env.example .env
python manage.py migrate
python manage.py seed_demo                              # logins: admin/admin12345, nutri/nutri12345, demo/demo12345
python manage.py runserver                              # http://localhost:8000, admin at /admin/
python manage.py test                                   # run after every backend change

# frontend (from frontend/)
npm install
npx ng serve                                            # http://localhost:4200
npx ng build                                            # must pass with no errors
```

## Conventions

- **Backend**
  - API under `/api/`. Auth: `Authorization: Bearer <access>` (JWT). Everything requires login
    except register/login.
  - Users only ever see **their own** meals/goal; nutritionists only see **their own clients**.
    Filter in `get_queryset`, never trust ids from the client.
  - Self-registration always creates `role=user`; roles are changed only by an admin.
  - Search on dishes uses `Dish.search_index` (lowercased names) because SQLite's `LIKE`
    ignores case only for Latin letters. Lowercase the search term before filtering.
  - New model → register it in `admin.py` with `list_display`, `search_fields`, `list_filter`.
  - New endpoint → add a test in the app's `tests.py`. Keep `python manage.py test` green.
  - After changing models: `python manage.py makemigrations` and commit the migration.
- **Frontend**
  - All HTTP calls go through `core/api.service.ts`; types in `core/models.ts`.
  - Standalone components with inline templates, `signal()` for state, `inject()` for DI.
  - Use the shared classes in `src/styles.scss` (`.card`, `.grid`, `.row`, `.btn`, `.muted`, `.error`).
  - Show dish/category names with `lang.localName(obj)` so they follow the selected language.
  - Keep the UI simple and clean. Mobile-friendly is nice, not required.
- **General**
  - Explain non-obvious code with short comments — both students must be able to defend it.
  - Never commit `.env`, `db.sqlite3`, `media/`, or model weights.
  - Small commits with clear messages, e.g. `feat(meals): weekly calories chart`.

## Demo script (what must always work)

1. Log in as `demo` → dashboard shows today's calories vs goal.
2. Add meal → upload a prepared photo → "Pizza 92%" → confirm → dashboard updates.
3. Switch EN → RU → KZ: whole UI changes, dish names too.
4. Search "пиц" / "pizza" → dishes, my meals, nutritionists.
5. Log in as `nutri` → My clients → client's meals → write a recommendation.
6. `/admin/` as `admin` → CRUD on dishes/users, role filter.

## Open TODOs (in rough order)

- [x] Train the 20-class Food-101 model in Colab, test with real photos
- [ ] Collect ~100–150 photos for each of the 7 custom classes, retrain on 27 classes, replace the weights
- [ ] Add-meal: manual dish search when the AI is wrong; 503 → friendly "model not ready" message
- [ ] Dashboard: weekly calories bar chart (Chart.js)
- [ ] History: date filter + pagination
- [ ] Clients page: open client → meals + "write recommendation" form
- [ ] Profile: edit name/email/bio/avatar, choose a nutritionist
- [ ] AI advice: `POST /api/advice/` calls an LLM with today's meals + goal (key in `LLM_API_KEY`)
- [ ] Notifications: badge for unread recommendations
- [ ] JWT refresh instead of logout on 401
