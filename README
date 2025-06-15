# 🌍 YAML Multilingual File Translator

Tired of manually translating your `.yml` files? This tool **automates the translation of `.yml` files** (like `pt-br.yml`) into multiple languages using the free `google-translate-api-x`. Streamline your localization process and keep your projects multilingual with ease!

---

## 🚀 Quick Start

Get your translations up and running in a few simple steps!

1. **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/your-repository.git
    cd your-repository
    ```

2. **Install dependencies:**
    ```bash
    npm install
    ```

3. **Add your input file** (e.g., `pt-br.yml`) to the root of the project. This will be the source for your translations.

4. **Run the script, specifying your desired target languages:**
    ```bash
    node traduzir-linhas.js en es fr
    ```
    This command will automatically generate `en.yml`, `es.yml`, and `fr.yml` files, each containing the translated content.

---

## 📁 Project Structure

To ensure the script works correctly, your project should follow this structure:

```text
├── pt-br.yml           # Your input file with text in the source language (e.g., Portuguese)
├── traduzir-linhas.js  # The core translation script
```

---

## ⚙️ Prerequisites

Before you begin, make sure you have:

- ✅ **Node.js 16+** installed on your system.
- 🌐 **An active internet connection** to access the translation API.

---

## 📝 Important Notes

- 📦 **API Usage**: This tool leverages the **unofficial and free Google Translate API** via `google-translate-api-x`.
- ⏱️ **Translation Speed**: Translating extensive files can take some time. The script is designed to handle this by automatically managing **pauses and retries**.
- 🪵 **Error Logging**: Any errors encountered during the translation process will be **logged** and saved in the `logs/` directory for easy debugging.

---

## ⚠️ Troubleshooting

If you encounter a `module not found` error for `google-translate-api-x`, install it manually with:

```bash
npm install google-translate-api-x
```
