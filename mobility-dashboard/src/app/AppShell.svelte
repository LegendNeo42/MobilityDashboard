<script lang="ts">
  import { dashboardContent } from "../content/dashboard";
</script>

<div class="appShell">
  <header class="hero">
    <p class="heroEyebrow">Universität Regensburg</p>
    <h1>{dashboardContent.title}</h1>
    <p class="heroSubtitle">{dashboardContent.subtitle}</p>
    <p class="heroText">{dashboardContent.intro}</p>

    <nav class="heroNav" aria-label="Dashboard-Bereiche">
      {#each dashboardContent.sectionLinks as link}
        <a class="heroNavCard" href={`#${link.id}`}>
          <p class="heroNavEyebrow">{link.eyebrow}</p>
          <h2>{link.title}</h2>
          <p>{link.text}</p>
        </a>
      {/each}
    </nav>
  </header>

  <main class="dashboardMain">
    <slot />
  </main>
</div>