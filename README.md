# NutriScan 🥗

Smart nutrition tracker with **AI food photo recognition**.
Take a photo of your meal → a CNN trained on Food-101 and our own photos of local dishes recognizes it → calories
and macros go into your daily log and are compared with your personal goal.

Final project for *Basics of Information Systems*, KBTU, 2026.

## Features

- Registration / login (JWT), profile with a nutrition goal
- **AI dish recognition** from a photo (ResNet-18, 27 dishes: 20 from Food-101 + 7 Kazakh and
  Central Asian dishes from our own photos — plov, shashlik, beshbarmak, manty, lagman, baursak, blini)
- Daily dashboard: calories, protein, fat, carbs vs goal
- Meal history, dish catalog
- Nutritionist role: clients' logs, recommendations
- Global search over dishes, meals and nutritionists
- 3 languages: English, Русский, Қазақша
- Admin panel with role-based access (Django Admin)

## Tech

Angular 20 · Django 6 + Django REST Framework · PyTorch · SQLite

## Run locally

**Backend**

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
pip install -r requirements-ml.txt   # for the AI feature
cp .env.example .env
python manage.py migrate
python manage.py seed_demo
python manage.py runserver
```

**Frontend**

```bash
cd frontend
npm install
npx ng serve
```

Open http://localhost:4200. Demo logins: `demo / demo12345`, `nutri / nutri12345`,
admin panel http://localhost:8000/admin/ with `admin / admin12345`.

## AI model

The model knows 27 classes: 20 from Food-101 and 7 from our own photos (Food-101 has no
Kazakh dishes).

**Our photos.** Put them in one folder per dish and zip the `kz_food` folder as `kz_food.zip`.
Folder names must be exactly these; aim for 100–150 `.jpg`/`.png` photos per dish (the notebook
warns below 80):

```
kz_food/
  plov/  shashlik/  beshbarmak/  manty/  lagman/  baursak/  blini/
```

**Train / retrain**

1. Open `backend/ml/notebooks/train_food_model.ipynb` in Google Colab (GPU runtime).
2. Run all cells (~20–30 min). When asked, upload `kz_food.zip` (or set `USE_DRIVE = True`
   to read it from Google Drive). The notebook splits our photos 80/20 into train/test and
   balances the small classes against the big Food-101 ones.
3. Download `food_model.pth` and `classes.json` into `backend/ml/weights/` (replace the old files).
4. Run `python manage.py seed_demo` so the catalog has all 27 dishes, then restart Django.
   `GET /api/ml/status/` should return `{"ready": true, "classes": 27}`.

To add another dish later: add its folder to `kz_food`, its name to `CUSTOM_CLASSES` in the
notebook, and a row with the same `ml_label` to `seed_demo.py`, then retrain.

Weights and photos are not stored in git (too large).

## Team

- Alikhan Ryskulov
- _teammate_
