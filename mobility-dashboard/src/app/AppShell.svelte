<script lang="ts">
  import { onMount, type Snippet } from "svelte";
  import { dashboardContent } from "../content/dashboard";

  let { children }: { children: Snippet } = $props();

  let heroQuestionsElement = $state<HTMLElement | null>(null);
  let isCompactNavigationVisible = $state(false);

  function updateCompactNavigationVisibility() {
    if (!heroQuestionsElement) {
      isCompactNavigationVisible = false;
      return;
    }

    isCompactNavigationVisible =
      heroQuestionsElement.getBoundingClientRect().bottom <= 0;
  }

  onMount(() => {
    updateCompactNavigationVisibility();

    window.addEventListener("scroll", updateCompactNavigationVisibility, {
      passive: true,
    });
    window.addEventListener("resize", updateCompactNavigationVisibility);

    return () => {
      window.removeEventListener("scroll", updateCompactNavigationVisibility);
      window.removeEventListener("resize", updateCompactNavigationVisibility);
    };
  });
</script>

<div class="appShell">
  <header class="hero">
    <div class="heroLayout">
      <h1>{dashboardContent.title}</h1>

      <figure class="heroImagePanel">
        <img
          src={dashboardContent.heroImage.src}
          alt={dashboardContent.heroImage.alt}
          width="3000"
          height="1899"
        />

        <figcaption class="heroImageOverlay">
          {dashboardContent.heroImage.message}
        </figcaption>
      </figure>

      <aside class="heroSpotlight" aria-label="Klimakontext zur Pendelmobilität">
        <div class="heroSpotlightInner">
          <p class="heroSpotlightEyebrow">
            {dashboardContent.climateContext.eyebrow}
          </p>
          <h2>{dashboardContent.climateContext.title}</h2>
          <p class="heroSpotlightText">{dashboardContent.climateContext.text}</p>

          <div class="heroSpotlightBars" aria-hidden="true">
            {#each dashboardContent.climateContext.items as item}
              <div class="heroSpotlightBarRow">
                <div class="heroSpotlightBarLabelRow">
                  <span class="heroSpotlightBarLabel">{item.label}</span>
                  <span class="heroSpotlightBarValue">{item.value} %</span>
                </div>

                <div class="heroSpotlightBarTrack">
                  <div
                    class="heroSpotlightBar"
                    class:heroSpotlightBar--primary={item.tone === "primary"}
                    class:heroSpotlightBar--secondary={item.tone === "secondary"}
                    class:heroSpotlightBar--muted={item.tone === "muted"}
                    style={`width: ${item.value}%`}
                  ></div>
                </div>
              </div>
            {/each}
          </div>

          <p class="heroSpotlightEmphasis">
            {dashboardContent.climateContext.emphasis}
          </p>
        </div>
      </aside>

      <nav
        bind:this={heroQuestionsElement}
        class="heroQuestionBlock"
        aria-label="Dashboard-Bereiche"
      >
        <p class="heroQuestionLabel">Dashboard-Bereiche</p>

        <div class="heroQuestionList">
          {#each dashboardContent.sectionNavigation as item}
            <a
              class={`heroQuestionChip theme-${item.theme}`}
              href={`#${item.targetId}`}
            >
              <span class="heroQuestionArea">{item.label}</span>
              <span>{item.question}</span>
            </a>
          {/each}
        </div>
      </nav>
    </div>
  </header>

  <nav
    class="sectionNavigationCompact"
    class:sectionNavigationCompact--visible={isCompactNavigationVisible}
    aria-label="Dashboard-Bereiche"
    aria-hidden={!isCompactNavigationVisible}
  >
    <div class="sectionNavigationCompactInner">
      {#each dashboardContent.sectionNavigation as item}
        <a
          class={`sectionNavigationCompactLink theme-${item.theme}`}
          href={`#${item.targetId}`}
          tabindex={isCompactNavigationVisible ? undefined : -1}
        >
          {item.label}
        </a>
      {/each}
    </div>
  </nav>

  <main class="dashboardMain">
    {@render children()}
  </main>
</div>
