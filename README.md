SpendWise: Intelligent Financial Advisor

SpendWise is a modern, single-page financial management application that combines expense tracking with an integrated AI Advisor powered by Google's Gemini. It helps users visualize their spending habits through dynamic charts and provides real-time financial coaching through a chat interface.

🚀 Features

Transaction Management: Easily record income and expenses with categories and descriptions.

AI Financial Advisor:

One-Click Analysis: Get instant summaries and pro-tips based on your spending history.

Interactive Chat: Ask the advisor specific questions about your budget, savings goals, or purchase decisions.

Dynamic Visualizations: Real-time SVG pie charts that break down your expenses by category.

Financial Overview: Instant tracking of total balance, total income, and total expenses.

Data Portability: Export your transaction history to CSV format with a single click for use in Excel or Google Sheets.

Responsive Design: Fully functional on desktop, tablet, and mobile devices using Tailwind CSS.

🛠️ Built With

HTML5/JavaScript: Core application logic.

Tailwind CSS: Modern, utility-first styling.

FontAwesome: High-quality iconography.

Google Gemini API: Powers the intelligent financial advisor.

📦 Installation & Setup

Since SpendWise is built as a portable single-file application, setup is minimal:

Clone the repository:

git clone [https://github.com/yourusername/spendwise.git](https://github.com/yourusername/spendwise.git)


Open the file:
Simply open spendwise.html in any modern web browser.

API Configuration:
To enable the AI features, you will need to add your Google Gemini API key:

Open spendwise.html in a text editor.

Locate const apiKey = ""; inside the <script> tag.

Insert your API key between the quotes.

📖 Usage

Add Entries: Use the "New Entry" form on the right to input your transactions.

Analyze: Click the Analyze button on the AI card to get a high-level summary of your financial health.

Chat: Click Chat to ask the advisor follow-up questions like "Can I afford a $50 dinner tonight?" or "How can I reduce my transport costs?".

Export: Use the Export CSV button in the header to back up your data.

🔒 Privacy & Data

All transaction data is stored in-memory during the session. SpendWise does not use external databases by default, ensuring your financial details stay private unless you choose to export them.
