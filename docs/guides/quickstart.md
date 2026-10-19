# 🚀 SECiD Platform - Quick Start Guide

Get the SECiD Alumni Platform running in under 5 minutes!

## 📋 Prerequisites

- **Node.js 20.17.0+** ([Download](https://nodejs.org/))
- **Git** ([Download](https://git-scm.com/))
- **Code Editor** (VS Code recommended)

## 🏃‍♂️ 15-Second Setup - NEW!

```bash
# Just three lines to glory!
git clone https://github.com/secid/secid-website.git
cd secid-website
make start
```

That's it! Your browser will automatically open to http://localhost:4321 🎉

**✨ The Magic of `make start`:**

- First time? It runs the complete setup
- Already set up? It skips to dev server
- No Firebase? Mock API activates automatically
- One command, zero configuration!

## 🔥 No Firebase? No Problem!

The platform includes a **Mock API** that works without any Firebase setup:

1. **Just start developing** - Mock API activates automatically when Firebase credentials are missing
2. **Test user**: `john.doe@example.com` (any password)
3. **Sample data**: Pre-populated jobs, users, and content

## 🛠️ Essential Commands

| Command      | Description                               |
| ------------ | ----------------------------------------- |
| `make start` | 🚀 The one command you need (setup + dev) |
| `make dev`   | Start development server only             |
| `make test`  | Run all tests                             |
| `make build` | Build for production                      |
| `make help`  | Show all commands                         |

## 📁 Key Files

```
secid-website/
├── src/
│   ├── pages/         # Website pages
│   ├── components/    # React components
│   └── lib/          # Core functionality
├── .env              # Environment config (optional)
└── Makefile          # Developer commands
```

## 🧪 Test Mock API

```bash
make test-mock
```

## 🌐 Key Features

- **🔐 Authentication** - Login/signup system
- **💼 Job Board** - Post and browse jobs
- **👥 Member Directory** - Connect with alumni
- **🌍 Bilingual** - Spanish/English support

## 🚀 Next Steps

1. **Explore the codebase** - Check out `src/pages/` for the main pages
2. **Create a component** - `make gen name=MyComponent`
3. **Add a new page** - Create `.astro` file in `src/pages/`
4. **Run tests** - `make test`

## 🆘 Need Help?

- **📖 Full Guide**: See [development.md](development.md)
- **🔧 Troubleshooting**: See [troubleshooting.md](troubleshooting.md)
- **🐛 Issues**: [GitHub Issues](https://github.com/SECiD-UNAM/secid-website/issues)

## 💡 Pro Tips

1. **Hot Reload** - Changes appear instantly in the browser
2. **TypeScript** - Full type safety and IntelliSense
3. **Mock API** - Develop without external dependencies
4. **Make Commands** - Everything you need is a `make` command away

---

Happy coding! 🎉 Welcome to the SECiD development team!
