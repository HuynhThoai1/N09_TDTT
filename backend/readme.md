# Backend Mock Run Guide
## 1) Go to backend folder

```bash
cd backend
```

## 2) Install dependencies

```bash
pip install -r requirements.txt
```

## 3) Apply migrations

```bash
python manage.py migrate
```

## 4) Load mock data

```bash
python manage.py load_mock_data
```

## 5) Run backend server

```bash
python manage.py runserver
```

Server URL: http://127.0.0.1:8000/

## 6) Quick API check

```bash
curl http://127.0.0.1:8000/api/pois/
```
