<script lang="ts">
</script>

<div class="relative inline-block ml-1 group">
    <button
        type="button"
        class="text-text-muted-light dark:text-text-muted-dark hover:text-eucalyptus-600 dark:hover:text-eucalyptus-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-eucalyptus-500 rounded-full"
        aria-label="Information"
    >
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="lucide lucide-info"
            ><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path
                d="M12 8h.01"
            /></svg
        >
    </button>
    <div
        class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-[var(--bg-elevated)] border border-black/10 dark:border-white/10 rounded-lg shadow-lg text-xs text-text-secondary-light dark:text-text-secondary-dark font-normal opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity z-10 text-pretty"
    >
        <slot />
    </div>
</div>
