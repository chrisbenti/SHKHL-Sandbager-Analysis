const fetch = require("node-fetch");

(async () => {
  const memoPlayerIsDivC = {};
  async function playerIsDivC(id) {
    if (memoPlayerIsDivC[id] !== undefined) {
      return memoPlayerIsDivC[id];
    }
    const data = await fetch(
      `https://snokinghockeyleague.com/api/player/details/${id}/0?v=1020620`
    );
    const player = await data.json();
    const d3Seasons = player.skater.seasonStats.filter(season => {
      const isDivDTeam =
        (season.seasonName === "2019-2020 SKAHL Fall-Winter" &&
          season.divName === "Division-C") ||
        (season.seasonName === "2019-2020 SKAHL Fall-Winter" &&
          season.divName === "Draft Beer Hockey League");
      const isRegularPlayer = season.player.stats.GP >= 2;
      console.log({});
      return isDivDTeam && isRegularPlayer;
    });
    const ans = d3Seasons.length >= 1;
    memoPlayerIsDivC[id] = ans;
    return ans;
  }
  console.log(await playerIsDivC(28099));
})();
