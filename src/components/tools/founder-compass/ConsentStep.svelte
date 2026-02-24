<script lang="ts">
  import { fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import type { QuizAnswer } from '@/lib/founder-compass/types';
  import { QUESTIONS } from './questions';

  let {
    answers = [] as QuizAnswer[],
    onSubmit = () => {},
    onBack = () => {},
    submitting = false,
  } = $props();

  let consentChecked = $state(false);

  let answeredCount = $derived(
    answers.filter((a) => a.selectedKey !== null).length
  );

  function getAnswerSummary(answer: QuizAnswer): string {
    const q = QUESTIONS.find((q) => q.id === answer.questionId);
    if (!q) return '';
    if (answer.selectedKey === 'custom') {
      return answer.customText.length > 80
        ? answer.customText.slice(0, 80) + '...'
        : answer.customText;
    }
    const opt = q.options.find((o) => o.key === answer.selectedKey);
    return opt
      ? opt.label.length > 80
        ? opt.label.slice(0, 80) + '...'
        : opt.label
      : '';
  }
</script>

<div
  class="mx-auto w-full max-w-2xl"
  in:fly={{ x: 60, duration: 320, easing: cubicOut }}
  out:fly={{ x: -60, duration: 240, easing: cubicOut }}
>
  <!-- Progress bar (full) -->
  <div class="mb-6">
    <div class="mb-2 flex items-center justify-between text-xs text-text-muted-light dark:text-text-muted-dark">
      <span>Auswertung</span>
      <span>100%</span>
    </div>
    <div class="h-1.5 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
      <div class="h-full w-full rounded-full bg-eucalyptus-500"></div>
    </div>
  </div>

  <div class="rounded-2xl border border-black/10 bg-[var(--bg-elevated)] p-6 dark:border-white/10">
    <h2 class="mb-2 text-lg font-semibold text-text-primary-light dark:text-text-primary-dark">
      Ihr Profil auswerten lassen
    </h2>
    <p class="mb-5 text-sm text-text-secondary-light dark:text-text-secondary-dark text-pretty">
      Sie haben alle {answeredCount} Fragen beantwortet. Bevor wir Ihr personalisiertes
      Gründerprofil erstellen, bitten wir um Ihre Zustimmung zur Datenübermittlung.
    </p>

    <!-- Answer summary -->
    <details class="mb-5 rounded-xl border border-black/10 dark:border-white/10">
      <summary class="cursor-pointer px-4 py-3 text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark hover:text-text-primary-light dark:hover:text-text-primary-dark transition-colors">
        Ihre Antworten ansehen ({answeredCount}/{QUESTIONS.length})
      </summary>
      <div class="space-y-2 px-4 pb-4">
        {#each answers as answer, i}
          {@const q = QUESTIONS.find((q) => q.id === answer.questionId)}
          {#if q && answer.selectedKey}
            <div class="rounded-lg bg-black/5 px-3 py-2 text-xs dark:bg-white/5">
              <span class="font-medium text-text-primary-light dark:text-text-primary-dark">
                {i + 1}. {q.dimension}:
              </span>
              <span class="text-text-secondary-light dark:text-text-secondary-dark">
                {getAnswerSummary(answer)}
              </span>
            </div>
          {/if}
        {/each}
      </div>
    </details>

    <!-- Privacy notice -->
    <div class="mb-5 rounded-xl border border-eucalyptus-500/30 bg-eucalyptus-500/5 p-4">
      <h3 class="mb-2 text-sm font-semibold text-text-primary-light dark:text-text-primary-dark">
        Datenschutzhinweis
      </h3>
      <ul class="space-y-1.5 text-xs text-text-secondary-light dark:text-text-secondary-dark">
        <li>Ihre Antworten werden einmalig an unseren KI-Dienst übermittelt.</li>
        <li>Es werden keine personenbezogenen Daten gespeichert.</li>
        <li>Die Auswertung erfolgt anonym — kein Account erforderlich.</li>
        <li>Ihr Ergebnis wird ausschließlich lokal in Ihrem Browser gespeichert.</li>
      </ul>
    </div>

    <!-- Consent checkbox -->
    <label class="mb-6 flex items-start gap-3 cursor-pointer">
      <input
        type="checkbox"
        bind:checked={consentChecked}
        class="mt-0.5 h-4 w-4 rounded border-black/20 text-eucalyptus-600 focus:ring-eucalyptus-500 dark:border-white/20"
      />
      <span class="text-sm text-text-secondary-light dark:text-text-secondary-dark">
        Ich stimme der einmaligen Übermittlung meiner Antworten zur KI-gestützten
        Auswertung zu.
      </span>
    </label>

    <!-- Navigation -->
    <div class="flex items-center justify-between">
      <button
        type="button"
        onclick={onBack}
        class="rounded-xl px-4 py-2.5 text-sm font-medium text-text-secondary-light transition-colors hover:text-text-primary-light dark:text-text-secondary-dark dark:hover:text-text-primary-dark"
      >
        Zurück
      </button>

      <button
        type="button"
        disabled={!consentChecked || submitting}
        onclick={onSubmit}
        class="rounded-xl px-6 py-2.5 text-sm font-semibold transition-all duration-200
          {consentChecked && !submitting
            ? 'bg-eucalyptus-600 text-white hover:bg-eucalyptus-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-eucalyptus-500 focus-visible:ring-offset-2 dark:bg-eucalyptus-500 dark:hover:bg-eucalyptus-400'
            : 'cursor-not-allowed bg-black/10 text-text-muted-light dark:bg-white/10 dark:text-text-muted-dark'}"
      >
        {submitting ? 'Wird analysiert ...' : 'Profil auswerten'}
      </button>
    </div>
  </div>
</div>
