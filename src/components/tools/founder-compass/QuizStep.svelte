<script lang="ts">
  import { fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import type { QuizOption } from '@/lib/founder-compass/types';

  let {
    questionNumber = 1,
    totalQuestions = 12,
    title = '',
    body = '',
    options = [] as QuizOption[],
    selectedKey = $bindable(null as string | null),
    customText = $bindable(''),
    onNext = () => {},
    onBack = (() => {}) as () => void,
  } = $props();

  let showCustom = $derived(selectedKey === 'custom');
  let charCount = $derived(customText.length);
  let isValid = $derived(
    selectedKey !== null &&
    (selectedKey !== 'custom' || customText.trim().length >= 10)
  );

  const CHAR_LIMIT = 1000;

  function selectOption(key: string) {
    selectedKey = key;
    if (key !== 'custom') {
      customText = '';
    }
  }

  function handleNext() {
    if (isValid) onNext();
  }

  function handleTextInput(e: Event) {
    const target = e.target as HTMLTextAreaElement;
    if (target.value.length <= CHAR_LIMIT) {
      customText = target.value;
    } else {
      customText = target.value.slice(0, CHAR_LIMIT);
      target.value = customText;
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey && isValid && selectedKey !== 'custom') {
      e.preventDefault();
      handleNext();
    }
  }
</script>

<div
  class="mx-auto w-full max-w-2xl"
  in:fly={{ x: 60, duration: 320, easing: cubicOut }}
  out:fly={{ x: -60, duration: 240, easing: cubicOut }}
  onkeydown={handleKeydown}
>
  <!-- Progress bar -->
  <div class="mb-6">
    <div class="mb-2 flex items-center justify-between text-xs text-text-muted-light dark:text-text-muted-dark">
      <span>Frage {questionNumber} von {totalQuestions}</span>
      <span>{Math.round((questionNumber / totalQuestions) * 100)}%</span>
    </div>
    <div class="h-1.5 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
      <div
        class="h-full rounded-full bg-eucalyptus-500 transition-all duration-500 ease-out"
        style="width: {(questionNumber / totalQuestions) * 100}%"
      ></div>
    </div>
  </div>

  <!-- Question card -->
  <div class="rounded-2xl border border-black/10 bg-[var(--bg-elevated)] p-6 dark:border-white/10">
    <h2 class="mb-2 text-lg font-semibold text-text-primary-light dark:text-text-primary-dark">
      {title}
    </h2>
    <p class="mb-5 text-sm text-text-secondary-light dark:text-text-secondary-dark text-pretty">
      {body}
    </p>

    <!-- Options -->
    <div class="space-y-2.5" role="radiogroup" aria-label={title}>
      {#each options as option (option.key)}
        <button
          type="button"
          role="radio"
          aria-checked={selectedKey === option.key}
          class="group flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-all duration-200
            {selectedKey === option.key
              ? 'border-eucalyptus-500 bg-eucalyptus-500/10 text-text-primary-light dark:border-eucalyptus-400 dark:bg-eucalyptus-500/15 dark:text-text-primary-dark'
              : 'border-black/10 bg-transparent text-text-secondary-light hover:border-eucalyptus-500/40 hover:bg-eucalyptus-500/5 dark:border-white/10 dark:text-text-secondary-dark dark:hover:border-eucalyptus-400/40'}"
          onclick={() => selectOption(option.key)}
        >
          <span
            class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-200
              {selectedKey === option.key
                ? 'border-eucalyptus-500 bg-eucalyptus-500 dark:border-eucalyptus-400 dark:bg-eucalyptus-400'
                : 'border-black/20 dark:border-white/20'}"
          >
            {#if selectedKey === option.key}
              <span class="h-1.5 w-1.5 rounded-full bg-white"></span>
            {/if}
          </span>
          <span class="font-medium">{option.key})</span>
          <span>{option.label}</span>
        </button>
      {/each}

      <!-- Custom answer option -->
      <button
        type="button"
        role="radio"
        aria-checked={selectedKey === 'custom'}
        class="group flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-all duration-200
          {selectedKey === 'custom'
            ? 'border-eucalyptus-500 bg-eucalyptus-500/10 text-text-primary-light dark:border-eucalyptus-400 dark:bg-eucalyptus-500/15 dark:text-text-primary-dark'
            : 'border-black/10 bg-transparent text-text-secondary-light hover:border-eucalyptus-500/40 hover:bg-eucalyptus-500/5 dark:border-white/10 dark:text-text-secondary-dark dark:hover:border-eucalyptus-400/40'}"
        onclick={() => selectOption('custom')}
      >
        <span
          class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-200
            {selectedKey === 'custom'
              ? 'border-eucalyptus-500 bg-eucalyptus-500 dark:border-eucalyptus-400 dark:bg-eucalyptus-400'
              : 'border-black/20 dark:border-white/20'}"
        >
          {#if selectedKey === 'custom'}
            <span class="h-1.5 w-1.5 rounded-full bg-white"></span>
          {/if}
        </span>
        <span class="font-medium">&#9998;</span>
        <span>Eigene Antwort / Sonstiges</span>
      </button>
    </div>

    <!-- Custom textarea -->
    {#if showCustom}
      <div
        class="mt-3"
        in:fly={{ y: -10, duration: 240, easing: cubicOut }}
      >
        <textarea
          class="w-full resize-none rounded-xl border border-black/10 bg-[var(--bg-primary)] px-4 py-3 text-sm text-text-primary-light placeholder:text-text-muted-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-eucalyptus-500/40 dark:border-white/10 dark:bg-[var(--bg-primary)] dark:text-text-primary-dark dark:placeholder:text-text-muted-dark transition-colors duration-200"
          rows="4"
          maxlength={CHAR_LIMIT}
          placeholder="Beschreiben Sie Ihre Situation oder Präferenz ..."
          aria-label="Eigene Antwort"
          value={customText}
          oninput={handleTextInput}
        ></textarea>
        <div class="mt-1 flex items-center justify-between text-xs">
          <span class="text-text-muted-light dark:text-text-muted-dark">
            Mindestens 10 Zeichen
          </span>
          <span
            class={charCount > CHAR_LIMIT * 0.9
              ? 'text-red-500'
              : 'text-text-muted-light dark:text-text-muted-dark'}
          >
            {charCount}/{CHAR_LIMIT}
          </span>
        </div>
      </div>
    {/if}

    <!-- Navigation -->
    <div class="mt-6 flex items-center justify-between">
      {#if questionNumber > 1}
        <button
          type="button"
          onclick={onBack}
          class="rounded-xl px-4 py-2.5 text-sm font-medium text-text-secondary-light transition-colors hover:text-text-primary-light dark:text-text-secondary-dark dark:hover:text-text-primary-dark"
        >
          Zurück
        </button>
      {:else}
        <span></span>
      {/if}

      <button
        type="button"
        disabled={!isValid}
        onclick={handleNext}
        class="rounded-xl px-6 py-2.5 text-sm font-semibold transition-all duration-200
          {isValid
            ? 'bg-eucalyptus-600 text-white hover:bg-eucalyptus-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-eucalyptus-500 focus-visible:ring-offset-2 dark:bg-eucalyptus-500 dark:hover:bg-eucalyptus-400'
            : 'cursor-not-allowed bg-black/10 text-text-muted-light dark:bg-white/10 dark:text-text-muted-dark'}"
      >
        {questionNumber < totalQuestions ? 'Weiter' : 'Weiter zur Auswertung'}
      </button>
    </div>
  </div>
</div>
