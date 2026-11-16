# NutriScan 🥗

Smart nutrition tracker with **AI food photo recognition**.
Take a photo of your meal → a CNN trained on Food-101 recognizes the dish → calories
and macros go into your daily log and are compared with your personal goal.

Final project for *Basics of Information Systems*, KBTU, 2026.

## Features

- Registration / login (JWT), profile with a nutrition goal
- **AI dish recognition** from a photo (ResNet-18 fine-tuned on Food-101, 20 dishes)
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

1. Open `backend/ml/notebooks/train_food_model.ipynb` in Google Colab (GPU runtime).
2. Run all cells (~20–30 min).
3. Download `food_model.pth` and `classes.json` into `backend/ml/weights/`.
4. Restart Django. `GET /api/ml/status/` should return `{"ready": true}`.

Weights are not stored in git (too large).

## Team

- Alikhan Ryskulov
- _teammate_
