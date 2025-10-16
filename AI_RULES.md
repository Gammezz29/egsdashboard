# AI Development Rules

This document outlines the core technologies and best practices for developing this application. Adhering to these guidelines ensures consistency, maintainability, and optimal performance.

## Tech Stack Overview

*   **Frontend Framework**: React (v18.x) for building dynamic user interfaces.
*   **Language**: TypeScript for type safety and improved code quality.
*   **Build Tool**: Vite for a fast development experience and optimized builds.
*   **UI Component Library**: shadcn/ui (built on Radix UI) for accessible and customizable UI components.
*   **Styling**: Tailwind CSS for utility-first styling, ensuring responsive and consistent designs.
*   **Routing**: React Router DOM for declarative client-side routing.
*   **Data Fetching & State Management**: Tanstack React Query for server state management, caching, and synchronization.
*   **Notifications**: Sonner for elegant and customizable toast notifications.
*   **Icons**: Lucide React for a comprehensive set of SVG icons.
*   **Form Management**: React Hook Form with Zod for robust form validation and handling.
*   **Charting**: Recharts for building interactive data visualizations.

## Library Usage Rules

To maintain a consistent and efficient codebase, please follow these rules when using libraries:

*   **UI Components**: Always prioritize `shadcn/ui` components for all user interface elements. If a specific component is not available in `shadcn/ui`, consider creating a new, small, and focused component that adheres to the existing design system and Tailwind CSS.
*   **Styling**: Use Tailwind CSS classes exclusively for all styling. Avoid inline styles or custom CSS files unless absolutely necessary for very specific, isolated cases (e.g., third-party library overrides). Ensure designs are responsive by utilizing Tailwind's responsive utility classes.
*   **Routing**: Use `react-router-dom` for all navigation within the application. Define routes in `src/App.tsx`.
*   **Data Fetching**: For any asynchronous data fetching or server state management, use `Tanstack React Query`. This includes fetching, caching, updating, and error handling for data.
*   **Notifications**: Implement all user feedback notifications (success, error, loading messages) using `sonner` toasts.
*   **Icons**: Use icons from `lucide-react`. Import them directly into your components.
*   **Forms**: For any forms requiring input validation and state management, use `react-hook-form` in conjunction with `zod` for schema validation.
*   **Charts**: When displaying data visualizations, use `recharts`.
*   **File Structure**:
    *   New components should be created in `src/components/`.
    *   New pages should be created in `src/pages/`.
    *   Utility functions should reside in `src/lib/` or `src/utils/`.
    *   Hooks should be in `src/hooks/`.
*   **Component Size**: Aim for small, focused components (ideally under 100 lines of code). If a component grows too large, consider refactoring it into smaller, more manageable sub-components.
*   **Error Handling**: Do not use `try/catch` blocks for API calls or other operations unless specifically requested. Errors should bubble up to be caught by global error boundaries or `Tanstack Query`'s error handling mechanisms.