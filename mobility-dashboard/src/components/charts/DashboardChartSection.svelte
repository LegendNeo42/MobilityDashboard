<script lang="ts">
  import type { Snippet } from "svelte";

  let {
    eyebrow,
    title,
    description,
    note = "",
    axisTitle = "",
    hasToolbar = false,
    hasMeta = false,
    toolbar,
    meta,
    children,
  } = $props<{
    eyebrow: string;
    title: string;
    description: string;
    note?: string;
    axisTitle?: string;
    hasToolbar?: boolean;
    hasMeta?: boolean;
    toolbar?: Snippet;
    meta?: Snippet;
    children?: Snippet;
  }>();
</script>

<article class="panel chartModule">
  <div class="sectionHeader">
    <div>
      <p class="sectionEyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      <p class="sectionText">{description}</p>
    </div>
  </div>

  <div class="chartSectionBody">
    {#if hasToolbar && toolbar}
      <div class="toolbar">
        {@render toolbar()}
      </div>
    {/if}

    {#if hasMeta && meta}
      <div class="chartMetaRow">
        {@render meta()}
      </div>
    {/if}

    {#if note}
      <p class="chartNote">{note}</p>
    {/if}

    <div class="chartFrame">
      {@render children?.()}
    </div>

    {#if axisTitle}
      <p class="chartAxisTitle">{axisTitle}</p>
    {/if}
  </div>
</article>