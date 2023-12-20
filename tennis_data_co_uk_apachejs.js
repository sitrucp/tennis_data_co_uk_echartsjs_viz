

// http://www.tennis-data.co.uk/alldata.php

// Array with all files and their names for list
const csvFiles = [
  { year: "2023 Men's", file: "tennis_data_co_uk/2023m.csv" },
  { year: "2022 Men's", file: "tennis_data_co_uk/2022m.csv" },
  { year: "2021 Men's", file: "tennis_data_co_uk/2021m.csv" },
];

let fullData = []; // To store the full dataset
let uniqueTournaments = []; // To store unique tournaments
let currentYear = "2023 Men's"; // Default to 2023
let currentTournament = ""; // Default tournament will be set after data load

document.addEventListener("DOMContentLoaded", () => {
    const queryParams = new URLSearchParams(window.location.search);
    const urlYear = queryParams.get('year');
    const urlTournament = queryParams.get('tournament');
  
    initializeFileList();
  
    if (urlYear && csvFiles.some(file => file.year === urlYear)) {
      currentYear = urlYear; // Set year from URL
      loadCSVData(getFilePathFromYear(urlYear), urlYear, () => {
        if (urlTournament) {
          filterByTournament(urlTournament, fullData, urlYear);
        } else if (uniqueTournaments.length > 0) {
          filterByTournament(uniqueTournaments[0], fullData, urlYear);
        }
      });
    } else {
      // Load default year and first tournament if no URL parameters
      currentYear = csvFiles[0].year;
      loadCSVData(getFilePathFromYear(csvFiles[0].year), csvFiles[0].year);
    }
  });
  

function initializeFileList() {
    const fileList = document.getElementById("fileList");
  
    csvFiles.forEach((file) => {
      const listItem = document.createElement("li");
      const link = document.createElement("a");
      link.href = "#";
      link.textContent = file.year;
      link.addEventListener("click", () => {
        currentYear = file.year;
        const filePath = getFilePathFromYear(file.year); // Correctly call getFilePathFromYear
        loadCSVData(filePath, file.year);
      });
      listItem.appendChild(link);
      fileList.appendChild(listItem);
    });
  }
  

function getFilePathFromYear(year) {
    const fileEntry = csvFiles.find((file) => file.year === year);
    const filePath = fileEntry ? '/public_data/tennis_data/' + fileEntry.file : '';
    return filePath; // Return the computed file path
}

function loadCSVData(filePath, year, callback) {
    Papa.parse(filePath, {
      download: true,
      header: true,
      dynamicTyping: true,
      complete: (results) => {
        fullData = processCSVRows(results.data);
        processCSVData(fullData, year);
        if (callback) callback();
      },
    });
  }
  

function processCSVRows(data) {
    return data
      .filter((row) => row.WRank !== "N/A" && row.LRank !== "N/A")
      .map((row) => {
        row.rank_diff = row.WRank - row.LRank;
        row.match_upset = determineMatchOutcome(row.B365W, row.B365L);
        return row;
      })
      .sort((a, b) => b.rank_diff - a.rank_diff);
  }

function processCSVData(data, year) {
  uniqueTournaments = extractUniqueTournaments(data);
  populateTournamentList(uniqueTournaments, year);

  if (uniqueTournaments.length > 0) {
    currentTournament = uniqueTournaments[0]; // Default to the first tournament
    filterByTournament(currentTournament, data, year);
  }
}

function determineMatchOutcome(B365W, B365L) {
  if (!B365W || !B365L) {
    return "No Odds";
  }
  return parseFloat(B365W) > parseFloat(B365L) ? "Upset" : "Favored";
}

function extractUniqueTournaments(data) {
  const tournaments = [...new Set(data.map((row) => row.Tournament))];
  tournaments.sort((a, b) => a.localeCompare(b));
  return tournaments;
}

function populateTournamentList(tournaments, year) {
  const tournamentList = document.getElementById("tournamentList");
  tournamentList.innerHTML = "";

  tournaments.forEach((tournament) => {
    const listItem = document.createElement("li");
    const link = document.createElement("a");
    link.href = "#";
    link.textContent = tournament;
    link.addEventListener("click", () => {
      filterByTournament(tournament, fullData, year);
    });
    listItem.appendChild(link);
    tournamentList.appendChild(listItem);
  });
}

function filterByTournament(tournamentName, data, year) {
  const filteredData = data.filter((row) => row.Tournament === tournamentName);
  visualizeData(filteredData, year, tournamentName);
  updateURLParameters(year, tournamentName); // Update URL whenever the tournament is changed
}

function updateURLParameters(year, tournament) {
    currentYear = year;
    currentTournament = tournament;
    const queryParams = new URLSearchParams();
    queryParams.set("year", year);
    queryParams.set("tournament", tournament);
    history.pushState({}, "", "/public_data/tennis_data?" + queryParams.toString());
  }
  

/////// create visualization

function createLabelText(item) {
  return `${item.Winner} (R ${item.WRank}) def ${item.Loser} (R ${item.LRank}) in the ${item.Round} ${item.Wsets}-${item.Lsets}`;
}

let myChart = null; // Declare this outside of your functions

function visualizeData(data, year, tournamentName) {
  // Select top 5 and bottom 5 items based on rank_diff
  const top5Indices = data
    .slice(0, 5)
    .map((item) => data.indexOf(item))
    .reverse();
  const bottom5Indices = data.slice(-5).map((item) => data.indexOf(item));

  // Function to create label offsets
  const labelOffsetTop = (index, step) => [0, -(index * step + 30)];
  const labelOffsetBottom = (index, step) => [0, index * step + 30];

  // Define colors based on match_upset value
  const colors = data.map((item) => {
    if (item.match_upset === "Upset") {
      return "#F875AA"; // pink color for Upset
    } else if (item.match_upset === "Favored") {
      return "#AEDEFC"; // blue color for Favored
    } else if (item.match_upset === "No Odds") {
      return "#D3D3D3"; // gray color for No bets
    }
  });

  // Define colors based on match_upset value
  const names = data.map((item) => {
    return item.match_upset;
  });

  // Your ECharts visualization logic goes here
  const xValues = data.map((_, index) => index);
  const yValues = data.map((item) => item.rank_diff);

  // Initialize ECharts instance and set options...
  const myChart = echarts.init(document.getElementById("visualization"));
  const option = {
    grid: {
      top: "20%", // Adjusts the space for grid (chart area)
    },
    title: {
      top: "1%",
      show: true,
      text: `${year} ${tournamentName} Match Players Rank Difference\n {descTextor| Positive difference indicates lower ranked player won usually a betting upset}\n {upsetColor| Upset} {favoredColor| Favored} {noOddsColor| No Odds}`,
      left: "center",
      textStyle: {
        fontWeight: "bold",
        fontSize: 12,
        rich: {
          descTextor: {
            color: "#333333", // color for desc text
            fontSize: 10,
          },
          upsetColor: {
            color: "#D85A8A", // Color for 'Upset'
            fontWeight: "bold",
          },
          favoredColor: {
            color: "#7FB3D5", // Color for 'Favored'
            fontWeight: "bold",
          },
          noOddsColor: {
            color: "#B0B0B0", // Color for 'No Odds'
            fontWeight: "bold",
          },
        },
      },
    },
    tooltip: {},
    xAxis: {
      data: xValues, // Hide the X-axis values
      show: false, // Hide the entire X-axis
      splitLine: {
        show: false, // Hides the horizontal grid lines for the y-axis
      },
    },
    yAxis: {
      splitLine: {
        show: false, // Hides the horizontal grid lines for the y-axis
      },
      axisLabel: {
        fontSize: 10,
      },
    },
    series: [
      {
        type: "bar",
        data: yValues.map((value, index) => {
          let isTopOrBottom =
            top5Indices.includes(index) || bottom5Indices.includes(index);
          let labelOffset = [0, 0];
          if (isTopOrBottom) {
            const step = 20; // This is the vertical distance between labels
            const positionIndex =
              index < data.length / 2
                ? top5Indices.indexOf(index)
                : bottom5Indices.indexOf(index);
            if (index < data.length / 2) {
              // Top 5 labels, reversed
              labelOffset = labelOffsetTop(positionIndex, step);
            } else {
              // Bottom 5 labels
              labelOffset = labelOffsetBottom(positionIndex, step);
            }
          }

          return {
            name: names[index],
            value: value,
            itemStyle: {
              color: colors[index],
            },
            // Configure labels for top 5 and bottom 5 bars
            labelLine: {
              show: true,
              lineStyle: {
                color: "#333",
                width: 1,
              },
            },
            label: {
              show: isTopOrBottom,
              position: index < data.length / 2 ? "right" : "left",
              offset: labelOffset,
              distance: 60,
              formatter: function (params) {
                // Use the data item associated with this index to create label text
                const item = data[params.dataIndex];
                return createLabelText(item);
              },
              //offset: [1, 1], // Adjust this value to fine-tune label positioning
            },
          };
        }),
        // Add more series configuration as needed
      },
    ],
    // Add annotations or other configurations
  };
  myChart.setOption(option);
}
