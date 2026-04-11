<script lang="ts">
  import { LUCIDE_ICONS, type IconNode } from '@/lib/icons/registry';

  interface Props {
    name: keyof typeof LUCIDE_ICONS;
    size?: number | string;
    strokeWidth?: number | string;
    color?: string;
    class?: string;
    [key: string]: any;
  }

  let {
    name,
    size = 24,
    strokeWidth = 2,
    color = 'currentColor',
    class: className = '',
    ...rest
  }: Props = $props();

  const iconNodes: IconNode[] = $derived(LUCIDE_ICONS[name] || []);
</script>

<svg
  xmlns="http://www.w3.org/2000/svg"
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill="none"
  stroke={color}
  stroke-width={strokeWidth}
  stroke-linecap="round"
  stroke-linejoin="round"
  class="lucide lucide-{name.toLowerCase()} {className}"
  aria-hidden="true"
  {...rest}
>
  {#each iconNodes as [tag, attrs]}
    <svelte:element this={tag} {...attrs} />
  {/each}
</svg>
