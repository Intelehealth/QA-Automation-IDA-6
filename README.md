# QA Automation Framework – IDA-6

##  Overview
This repository contains a scalable QA automation framework built using Playwright for end-to-end testing of web applications.

This framework was developed as part of a Proof of Concept (POC) to establish a reliable and maintainable automation solution integrated with CI/CD pipelines for continuous testing and faster feedback.

---

## Objectives
- Improve application quality through automation
- Reduce manual testing effort
- Enable reliable regression testing
- Support continuous integration and delivery

---

## Contribution
As part of this implementation, I have:
- Designed and developed the automation framework using Playwright
- Implemented Page Object Model (POM) for better structure and reusability
- Integrated Allure reporting for detailed test insights
- Configured GitHub Actions for CI/CD execution
- Set up Slack notifications for real-time test updates

---

## Framework Design
The framework follows a modular and scalable design:

- Page Object Model (POM) for maintainability
- Reusable components and utilities
- Clear separation between test logic and page actions
- Structured test suites for easy scalability

---

## Technology Stack
- Playwright (JavaScript)
- Node.js
- Allure Reports
- GitHub Actions
- Slack Webhooks

---

## Execution Strategy
- Automated tests are triggered via CI/CD pipelines
- Supports parallel execution for faster runs
- Generates detailed reports using Allure
- Provides real-time notifications via Slack

---

## Prerequisites
Ensure the following are installed:
- Node.js (v16 or higher)
- npm

---

##  Setup Instructions

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

Reporting
To open Allure report:
npx allure open