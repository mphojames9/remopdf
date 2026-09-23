# Use the official Playwright Python image which contains all system dependencies
FROM mcr.microsoft.com/playwright/python:v1.45.0-jammy

WORKDIR /app

# Copy your requirements file and install Python packages
# (Adjust the path if your requirements file is named or located differently)
COPY backEnd/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of your application code into the container
COPY . .

# Expose the default Render port
EXPOSE 10000

# Run your application from inside backEnd/, since main.py's own imports
# (e.g. `from routers.editor import ...`) expect backEnd/ to be the working
# directory rather than running as a package from /app.
WORKDIR /app/backEnd
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "10000"]