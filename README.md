# Jazzi Creates Clone

A modern Next.js TypeScript application built with the latest web technologies and best practices.

## 🚀 Features

- **Next.js 15** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **Redux Toolkit** for state management
- **React Icons** for beautiful icons
- **Framer Motion** for animations
- **React Hot Toast** for notifications
- **ESLint & Prettier** for code quality
- **Husky & lint-staged** for pre-commit hooks
- **Jest & Testing Library** for testing
- **Commitlint** for conventional commits

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- [Node.js](https://nodejs.org/) (version 18 or higher)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd jazzi-creates-clone
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   Edit `.env.local` with your configuration values.

4. **Start the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📜 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint with auto-fix
- `npm run format` - Format code with Prettier
- `npm run test` - Run tests
- `npm run test:watch` - Run tests in watch mode

## 🏗️ Project Structure

```
src/
├── app/                 # Next.js App Router pages
│   ├── error.tsx       # Error boundary
│   ├── layout.tsx      # Root layout
│   ├── not-found.tsx   # 404 page
│   └── page.tsx        # Home page
├── assets/             # Static assets
│   ├── css/           # Global styles
│   └── img/           # Images
├── components/         # Reusable components
│   └── global/        # Global components
├── store/             # Redux store configuration
│   ├── Providers.tsx  # Store providers
│   └── sample/        # Example Redux slices
└── utils/             # Utility functions
    └── axios.ts       # Axios configuration
```

## 🎨 Styling

This project uses **Tailwind CSS** for styling. The configuration is in `tailwind.config.ts`.

### Custom CSS Classes
- Global styles are in `src/assets/css/globals.css`
- Component-specific styles can be added using Tailwind's utility classes

## 🔧 Configuration Files

- `next.config.mjs` - Next.js configuration
- `tailwind.config.ts` - Tailwind CSS configuration
- `tsconfig.json` - TypeScript configuration
- `jest.config.js` - Jest testing configuration
- `commitlint.config.js` - Commit message linting
- `release-please-config.json` - Release automation

## 🧪 Testing

The project includes Jest and React Testing Library for testing:

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch
```

## 📦 Dependencies

### Core Dependencies
- **Next.js 15** - React framework
- **React 18** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first CSS framework

### State Management
- **Redux Toolkit** - State management
- **React Redux** - React bindings for Redux

### UI & UX
- **React Icons** - Icon library
- **Framer Motion** - Animation library
- **React Hot Toast** - Toast notifications
- **React Toastify** - Additional toast functionality

### Development Tools
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Husky** - Git hooks
- **lint-staged** - Pre-commit linting
- **Commitlint** - Commit message validation

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Commit Convention

This project follows [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `style:` - Code style changes
- `refactor:` - Code refactoring
- `test:` - Test changes
- `chore:` - Build process or auxiliary tool changes

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/your-repo/issues) page
2. Create a new issue with detailed information
3. Contact the maintainers

## 🔄 Updates

To keep your project up to date:

```bash
# Update dependencies
npm update

# Check for outdated packages
npm outdated

# Update to latest versions (use with caution)
npm update --latest
```

---

**Happy coding! 🎉**