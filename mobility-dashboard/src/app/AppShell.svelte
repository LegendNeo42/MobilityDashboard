<script lang="ts">
  import { dashboardContent } from "../content/dashboard";
</script>

<div class="appShell">
  <header class="hero">
    <div class="heroLayout">
      <div class="heroContent">
        <h1>{dashboardContent.title}</h1>

        <div class="heroNarrative">
          <p class="heroHook">{dashboardContent.hook}</p>

          <div class="heroIntro">
            <p class="heroSubtitle">{dashboardContent.subtitle}</p>
            <p class="heroText">{dashboardContent.intro}</p>
          </div>
        </div>
      </div>

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

      <div class="heroQuestionBlock">
        <p class="heroQuestionLabel">Fragen im Fokus</p>

        <div class="heroQuestionList">
          {#each dashboardContent.heroQuestions as question}
            <a class="heroQuestionChip" href={`#${question.targetId}`}>
              <span class="heroQuestionArea">{question.area}</span>
              <span>{question.question}</span>
            </a>
          {/each}
        </div>
      </div>
    </div>
  </header>

  <main class="dashboardMain">
    <slot />
  </main>
</div>