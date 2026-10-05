# Use the official Playwright Python image which contains all system dependencies
FROM mcr.microsoft.com/playwright/python:v1.45.0-jammy

WORKDIR /app

# Copy your requirements file and install Python packages
# (Make sure requirements.txt pins playwright==1.45.0 to match this image)
COPY backEnd/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of your application code into the container
COPY . .

# Expose the default Render port
EXPOSE 10000

# Run your application.
# --app-dir puts /app/backEnd on the import path, so main.py can do
# "from routers.editor import ..." exactly like it does when run locally.
CMD ["uvicorn", "main:app", "--app-dir", "backEnd", "--host", "0.0.0.0", "--port", "10000"]
