const ObjectsToCsv = require("objects-to-csv");
const fetch = require("node-fetch");

const memoPlayerIsDivC = {};
async function playerIsDivC(id) {
  if (memoPlayerIsDivC[id] !== undefined) {
    return { id, ans: memoPlayerIsDivC[id] };
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
    return isDivDTeam && isRegularPlayer;
  });
  const ans = d3Seasons.length >= 1;
  memoPlayerIsDivC[id] = ans;
  return { id, ans };
}

(async () => {
  const data = await fetch(
    "https://snokinghockeyleague.com/api/game/list/1063/178/0?v=1020620"
  );
  const analyizedGames = [];
  const violations = [];

  const games = await data.json();
  const gamesWithBoxscore = games.filter(x => x.isScoresheetSet);
  for (i = 0; i < gamesWithBoxscore.length; i++) {
    //   for (i = 0; i < 1; i++) {
    console.log(`On ${i + 1} of ${gamesWithBoxscore.length}`);
    const gameToCheck = gamesWithBoxscore[i];
    const gameData = await (await fetch(
      `https://snokinghockeyleague.com/api/scoresheet/getView/${gameToCheck.id}?v=1020620`
    )).json();
    try {
      const homeSkaters = gameData.gameSummarySkatersHome.map(x => x.player.id);
      const awaySkaters = gameData.gameSummarySkatersAway.map(x => x.player.id);

      const homeDiv3Skaters = (await Promise.all(
        homeSkaters.map(x => playerIsDivC(x))
      )).filter(x => x.ans);
      const awayDiv3Skaters = (await Promise.all(
        awaySkaters.map(x => playerIsDivC(x))
      )).filter(x => x.ans);
      const newGame = {
        gameId: gameToCheck.id,
        gameLink: `https://snokinghockeyleague.com/#/scoresheet/${gameToCheck.id}`,
        homeTeamName: gameToCheck.teamHomeName,
        homeDiv3Skaters: homeDiv3Skaters.length,
        awayTeamName: gameToCheck.teamAwayName,
        awayDiv3Skaters: awayDiv3Skaters.length,
        teamHasMoreThan2DivC:
          homeDiv3Skaters.length > 2 || awayDiv3Skaters.length > 2
            ? "YES"
            : "NO"
      };
      analyizedGames.push(newGame);

      const addViolator = (team, name) => {
        if (team.length > 2) {
          console.log(`${name} violated`);
          const violator = {
            teamName: name,
            gameLink: `https://snokinghockeyleague.com/#/scoresheet/${gameToCheck.id}`
          };
          team.forEach((skater, index) => {
            violator[
              `div_c_player_${index}`
            ] = `https://snokinghockeyleague.com/#/player/details/${skater.id}`;
          });
          violations.push(violator);
        }
      };
      addViolator(homeDiv3Skaters, gameToCheck.teamHomeName);
      addViolator(awayDiv3Skaters, gameToCheck.teamAwayName);
    } catch (e) {
      console.error(e);
      console.error({ gameData });
    }
  }
  const csv = new ObjectsToCsv(analyizedGames);
  await csv.toDisk("./games.csv");

  const csv2 = new ObjectsToCsv(violations);
  await csv2.toDisk("./violations.csv");
})();
