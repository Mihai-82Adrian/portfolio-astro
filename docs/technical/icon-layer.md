# Local Icon Layer

## Rationale
The project migrated to a local icon layer to resolve persistent SSR (Server-Side Rendering) module resolution errors in Astro v6 when using the `@lucide/svelte` package. `@lucide/svelte` exports raw `.svelte` files which caused Vite SSR loader failures.

## Architecture
The system consists of two parts:
1.  **Registry** (`src/lib/icons/registry.ts`): Stores static SVG path data extracted from Lucide.
2.  **Component** (`src/components/ui/Icon.svelte`): A Svelte 5 component that renders the SVG paths using `svelte:element`.

## Benefits
-   **Build Stability**: 100% stable production builds without custom SSR/resolve hacks.
-   **Type Safety**: The `name` prop is constrained to keys available in the registry.
-   **Performance**: Zero runtime dependency on the lucide-svelte library; only used paths are bundled.
-   **Accessibility**: Defaults to `aria-hidden="true"` for decorative icons.

## Future Rules
To maintain project stability, please follow these rules for new icons:
-   **Astro Pages (`.astro`)**: Use `@lucide/astro` (standard imports).
-   **Svelte Components (`.svelte`)**: **Only** use `src/components/ui/Icon.svelte`. Do not import from `@lucide/svelte`.
-   **Adding Icons**: If a new icon is needed for Svelte, add its path data to `src/lib/icons/registry.ts`.
