<script lang="ts">
  import { dashboardContent } from "../content/dashboard";
</script>

<div class="appShell">
  <header class="hero">
    <p class="heroEyebrow">Universität Regensburg</p>
    <h1>{dashboardContent.title}</h1>

    <div class="heroIntro">
      <p class="heroSubtitle">{dashboardContent.subtitle}</p>
      <p class="heroText">{dashboardContent.intro}</p>
    </div>

    <div class="heroNavHeader">
      <p class="heroNavLabel">Direkt zu den Bereichen</p>
    </div>

    <nav class="heroNav" aria-label="Dashboard-Bereiche">
      {#each dashboardContent.sectionLinks as link}
        <a
          class="heroNavCard"
          class:theme-overview={link.theme === "overview"}
          class:theme-analysis={link.theme === "analysis"}
          class:theme-region={link.theme === "region"}
          class:theme-context={link.theme === "context"}
          href={`#${link.id}`}
        >
          <p class="heroNavEyebrow">{link.eyebrow}</p>
          <h2>{link.title}</h2>
          <p>{link.text}</p>
          <span class="heroNavAction">
            {link.action}
            <span aria-hidden="true">↓</span>
          </span>
        </a>
      {/each}
    </nav>
  </header>

  <main class="dashboardMain">
    <slot />
  </main>
</div>