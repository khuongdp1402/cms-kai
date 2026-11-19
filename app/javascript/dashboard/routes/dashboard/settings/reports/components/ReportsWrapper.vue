<!-- Detailed reports (Nâng cao) inside the KaloPage frame (guided UX spec §2):
     canvas background, ReportHeader as the sticky page header. -->
<template>
  <section
    data-test-id="kalo-page"
    class="flex flex-col flex-1 w-full h-full min-w-0 overflow-y-auto bg-n-background"
  >
    <div class="w-full max-w-5xl px-4 pb-12 mx-auto sm:px-6 lg:px-8">
      <router-view />
    </div>
  </section>
</template>
