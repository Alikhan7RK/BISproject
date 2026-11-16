# Claude Code prompts for NutriScan

Run Claude Code from the repo root, so it reads `CLAUDE.md` automatically.
Use one prompt per session, then test it yourself and commit before the next one.
Tip: start each prompt in **plan mode** (Shift+Tab) for bigger features, read the plan, then approve.

---

## 0. First session: get oriented (always start here on a new machine)

```
Read CLAUDE.md and the project structure. Then set up and verify the project on this machine:
1. Backend: create the venv, install requirements.txt, copy .env.example to .env, migrate,
   run seed_demo, run the tests.
2. Frontend: npm install and npx ng build.
Report what works and what fails. Do not change any code yet, just tell me what you found.
```

---

## 1. Plug in the trained model (after training in Colab)

```
I trained the model in Colab with backend/ml/notebooks/train_food_model.ipynb and put
food_model.pth and classes.json into backend/ml/weights/.
1. Install requirements-ml.txt (use the CPU-only torch index if possible).
2. Check that GET /api/ml/status/ returns ready: true.
3. Write a small script backend/ml/check_model.py that runs predict() on every image in a folder
   I pass as an argument and prints the top-3 predictions, so I can test my demo photos.
4. Make sure the architecture and preprocessing in predictor.py exactly match the notebook.
Explain the result in simple words.
```

---

## 2. Add-meal page: manual fallback and friendly errors

```
Improve frontend/src/app/pages/add-meal:
1. If /api/ml/recognize/ returns 503, show a translated friendly message ("AI model is not ready,
   choose the dish manually") instead of the raw error.
2. Add "Not right? Choose manually": a search box using api.dishes(search) that lets the user
   pick any dish from the catalog (then ai_confidence is null).
3. Show a loading spinner while recognizing, and the photo preview next to the predictions.
4. After saving, show a success toast on the dashboard.
Add all new strings to en.json, ru.json and kk.json. Keep the code simple and commented.
```

---

## 3. Dashboard weekly chart

```
Add a weekly calories chart to the dashboard using Chart.js (already installed).
Backend: add GET /api/meals/weekly/?days=7 that returns [{date, calories, goal}] for the logged-in
user, for each of the last N days (days with no meals = 0). Add a test.
Frontend: a bar chart of calories per day with a line for the goal, labels translated, chart
re-renders when the language changes.
```

---

## 4. Nutritionist: clients page

```
Finish the nutritionist flow on frontend/src/app/pages/clients:
1. Clicking a client opens /clients/:id with their meals (api.clientMeals) grouped by day
   with daily totals.
2. A form on that page to write a recommendation (title + text) via api.createRecommendation.
3. Backend: make sure a nutritionist can never see meals of someone who is not their client
   (add a test for this).
All strings translated in en/ru/kk.
```

---

## 5. Profile: edit profile and choose a nutritionist

```
Extend the profile page:
1. Edit first name, last name, email, bio, avatar (multipart PATCH /api/auth/me/).
2. Choose a nutritionist from a searchable list (api.nutritionists) - only for role "user".
3. preferred_language: when the user changes it, switch the UI language; on login, apply the
   saved language.
Backend: validate that the nutritionist field can only point to a user with role nutritionist.
Add tests. Translate all strings.
```

---

## 6. AI advice with an LLM API (optional "wow" feature)

```
Add an "AI advice" feature.
Backend: POST /api/advice/ builds a short prompt from today's meals and the user's goal and sends it
to the LLM API (key from settings.LLM_API_KEY, read from .env). It answers in the user's
preferred_language, max ~120 words. If there is no key or the call fails, return 503 with a clear
message. Never call the LLM from Angular. Add a test that mocks the API call.
Frontend: an "Ask AI for advice" button on the dashboard that shows the answer in a card.
```

---

## 7. History page and notifications

```
1. History page: date range filter, filter by meal type, pagination (backend already paginates
   with ?page=), and a search box.
2. Navbar: badge with the number of unread recommendations (add GET /api/recommendations/unread_count/).
3. JWT: instead of logging out on 401, try /api/auth/token/refresh/ once, then retry the request.
Add tests for the new endpoint and translate all strings.
```

---

## 8. Admin panel polish (5 exam points)

```
Polish the Django admin for the demo:
1. Create Django groups "Nutritionists" and "Content managers" with sensible model permissions
   in a data migration, and make sure staff users only see what their group allows.
2. Show photo thumbnails for Meal and Dish in list views.
3. Dish admin: inline list of recent meals, export to CSV action.
4. Jazzmin: icons for each model, custom welcome text.
Explain how role-based access works so I can tell the teacher.
```

---

## 9. Before the exam: demo check

```
We present tomorrow. Do a full demo check:
1. Run all backend tests and ng build.
2. Walk through the "Demo script" in CLAUDE.md and list anything broken or untranslated
   (grep templates for hardcoded English text).
3. Seed realistic data for the last 7 days for user "demo" so charts look good.
4. Write docs/DEMO.md: exact click-by-click steps and what to say at each step.
Fix only small issues; ask me before any big change.
```

---

## Alternative: let Claude Code build the backbone from scratch

Only if you want to start over instead of using this repo.

```
Create a monorepo "nutriscan" for a university final project: a smart nutrition app with AI food
photo recognition.
- backend/: Django + Django REST Framework, SimpleJWT, django-filter, django-cors-headers, jazzmin, SQLite.
  Apps: accounts (custom User with role user/nutritionist/admin, preferred_language en/ru/kk,
  nutritionist FK to self), nutrition (DishCategory, Dish with name_en/ru/kk + ml_label + kcal and
  macros per 100 g, Meal, NutritionGoal, Recommendation), ml (predictor that lazily loads a
  ResNet-18 state_dict + classes.json from ml/weights and returns top-3 predictions; POST
  /api/ml/recognize/). Global search endpoint over dishes, my meals and nutritionists.
  Django Admin for all models. A seed_demo command with 20 Food-101 dishes and 3 demo users. Tests.
- frontend/: Angular 20 standalone + signals, ngx-translate with en/ru/kk, JWT interceptor and
  guards, pages: login, register, dashboard, add-meal (upload photo -> predictions -> confirm),
  dishes, history, search, profile/goal, recommendations, clients.
- backend/ml/notebooks/train_food_model.ipynb for Colab: fine-tune ResNet-18 on 20 Food-101 classes,
  plot curves and confusion matrix, export weights. Preprocessing must match the predictor.
- CLAUDE.md describing all of this, plus README.md.
Use plan mode first and show me the plan before writing code.
```
