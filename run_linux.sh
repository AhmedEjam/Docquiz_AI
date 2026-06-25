#!/bin/bash
# Move to the directory where this script is located
cd "$(dirname "$0")/scan-to-quiz"

echo "==============================="
echo " Starting Docquiz AI (Linux) "
echo "==============================="

echo "Checking dependencies..."
npm install

echo "Starting development server..."
npm run dev
