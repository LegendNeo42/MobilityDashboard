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
    infoTitle = "",
    infoIntro = "",
    infoItems = [],
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
    infoTitle?: string;
    infoIntro?: string;
    infoItems?: string[];
    toolbar?: Snippet;
    meta?: Snippet;
    children?: Snippet;
  }>();

  let hasInfo = $derived(infoItems.length > 0 || Boolean(infoIntro));
</script>

<article class="panel chartModule">
  <div class="sectionHeader">
    <div class="sectionHeaderMain">
      <p class="sectionEyebrow">{eyebrow}</p>
      <div class="sectionTitleRow">
        <h2>{title}</h2>

        {#if hasInfo}
          <div class="sectionInfoTooltip">
            <button
              type="button"
              class="sectionInfoButton"
              aria-label={`Hinweise zu ${title}`}
            >
              i
            </button>
            <div class="sectionInfoPopover" role="tooltip">
              {#if infoTitle}
                <p class="sectionInfoPopoverTitle">{infoTitle}</p>
              {/if}

              {#if infoIntro}
                <p class="sectionInfoPopoverIntro">{infoIntro}</p>
              {/if}

              {#if infoItems.length > 0}
                <ul class="sectionInfoPopoverList">
                  {#each infoItems as item}
                    <li>{item}</li>
                  {/each}
                </ul>
              {/if}
            </div>
          </div>
        {/if}
      </div>
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
