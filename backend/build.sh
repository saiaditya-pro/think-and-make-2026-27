#!/usr/bin/env bash
# Render build command (Root Directory: backend). Migrations run here because
# Render's Pre-Deploy Command isn't available on the free plan.
set -o errexit

pip install -r requirements.txt
python manage.py collectstatic --no-input
python manage.py migrate --no-input
