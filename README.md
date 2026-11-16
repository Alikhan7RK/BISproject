# NutriScan 🥗

Smart nutrition tracker with **AI food photo recognition**.
Take a photo of your meal → a CNN trained on Food-101 and the Central Asian Food Dataset recognizes it → calories
and macros go into your daily log and are compared with your personal goal.

Final project for *Basics of Information Systems*, KBTU, 2026.

## Features

- Registration / login (JWT), profile with a nutrition goal
- **AI dish recognition** from a photo (ResNet-18, 28 dishes: 20 from Food-101 + 8 Kazakh and
  Central Asian dishes from CAFD — plov, manty, baursak, beshbarmak, lagman, shashlik, samsa, doner)
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

The model knows 28 classes:

- **20 from Food-101** (pizza, sushi, steak, …).
- **8 local dishes from the Central Asian Food Dataset (CAFD)** by ISSAI, Nazarbayev University,
  because Food-101 has no Kazakh dishes: plov, manty, baursak, beshbarmak, lagman, shashlik,
  samsa, doner. Some of our classes merge several CAFD folders (for example the three kinds of
  lagman); the mapping is `CAFD_CLASSES` in the notebook.

The notebook downloads both datasets by itself. It uses CAFD's own split (`train/` for training,
`val/` + `test/` for testing), takes at most 750 training photos per class, and balances the
smaller classes with a weighted sampler.

**Train / retrain**

1. Open `backend/ml/notebooks/train_food_model.ipynb` in Google Colab (GPU runtime).
2. Run all cells. Nothing has to be uploaded.
3. Download `food_model.pth` and `classes.json` into `backend/ml/weights/` (replace the old files).
4. Run `python manage.py seed_demo` so the catalog has all the dishes, then restart Django.
   `GET /api/ml/status/` should return `{"ready": true, "classes": 28}`.

**Adding a dish that no dataset has** (optional, for example thin blini): collect 100–150 photos,
zip them as `kz_food.zip` with one folder per dish (`kz_food/blini/*.jpg`), set
`USE_OWN_PHOTOS = True` and `OWN_CLASSES = ['blini']` in the notebook and retrain. The dish needs
a row with the same `ml_label` in `seed_demo.py` (blini already has one).

Weights and datasets are not stored in git (too large).

**Dataset credit and license.** CAFD is licensed **CC BY-NC 4.0**: attribution is required and
use is **non-commercial only**, so the trained model is for this study project, not for
commercial use.

> Karabay, A., Bolatov, A., Varol, H. A., & Chan, M.-Y. (2023). A Central Asian Food Dataset for
> Personalized Dietary Interventions. *Nutrients*, 15(7), 1728. https://doi.org/10.3390/nu15071728
>
> Dataset: https://huggingface.co/datasets/issai/Central_Asian_Food_Dataset

Food-101: Bossard, L., Guillaumin, M., & Van Gool, L. (2014). Food-101 – Mining Discriminative
Components with Random Forests. ECCV.

## Team

- Alikhan Ryskulov
- _teammate_
