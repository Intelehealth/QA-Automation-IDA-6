# QA Automation Framework – IDA-6

## Overview
This repository contains a scalable automation framework built using Playwright for end-to-end testing of web applications. It is integrated with CI/CD pipelines to enable continuous testing, reporting, and faster feedback cycles.

---

## Objectives
- Improve application quality through automation
- Reduce manual testing effort
- Enable reliable regression testing
- Support continuous integration and delivery

---

## Technology Stack
- Playwright (JavaScript)
- Node.js
- Allure Reports
- GitHub Actions
- Slack Webhooks

---

## Prerequisites
Ensure the following are installed:
- Node.js (v16 or higher)
- npm

---

## Setup Instructions

### Clone Repository
```bash
git clone https://github.com/Intelehealth/QA-Automation-IDA-6.git
cd QA-Automation-IDA-6


Install Dependencies
npm install

Install Browsers
npx playwright install

Test Execution
npx playwright test

To open report:
npx allure open