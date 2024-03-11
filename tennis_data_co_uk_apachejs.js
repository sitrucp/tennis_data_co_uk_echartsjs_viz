// http://www.tennis-data.co.uk/alldata.php

// Array with all files and their names for list
const csvFiles = [
    { year: "2024 Men's", file: "tennis_data_co_uk/2024m.csv" },
    { year: "2023 Men's", file: "tennis_data_co_uk/2023m.csv" },
    { year: "2022 Men's", file: "tennis_data_co_uk/2022m.csv" },
    { year: "2021 Men's", file: "tennis_data_co_uk/2021m.csv" },
    { year: "2024 Women's", file: "tennis_data_co_uk/2024f.csv" },
    { year: "2023 Women's", file: "tennis_data_co_uk/2023f.csv" },
    { year: "2022 Women's", file: "tennis_data_co_uk/2022f.csv" },
    { year: "2021 Women's", file: "tennis_data_co_uk/2021f.csv" },
  ];
  
  let fullData = []; // To store the full dataset
  let uniqueTournaments = []; // To store unique tournaments
  let currentYear = "2023 Men's"; // Default to 2023
  let currentTournament = ""; // Default tournament will be set after data load
  
  document.addEventListener("DOMContentLoaded", () => {
    const queryParams = new URLSearchParams(window.location.search);
    const urlYear = queryParams.get("year");
    const urlTournament = queryParams.get("tournament");
  
    initializeFileList();
  
    if (urlYear && csvFiles.some((file) => file.year === urlYear)) {
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
  
	function formatDate(originalDate) {
		// Initialize parts variable
		let parts;

		if (typeof originalDate === 'undefined') {
				//console.error('formatDate called with undefined date value.');
				return ''; 
			}
			
		// Check if the date is in "YYYY-MM-DD" format
		if (typeof originalDate === 'string' && originalDate.includes('-')) {
			parts = originalDate.split('-');
			// Create a date object using the parts
			let date = new Date(parts[0], parts[1] - 1, parts[2]);
			return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
		}
		// Check if the date is in "MM/DD/YYYY" format
		else if (typeof originalDate === 'string' && originalDate.includes('/')) {
			parts = originalDate.split('/');
			// Create a date object using the parts
			let date = new Date(parts[2], parts[0] - 1, parts[1]);
			return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
		} else {
			// Log an error if the date format is unrecognized
			console.error('Invalid date format:', originalDate);
			return originalDate; // Return the original string if it's not in the expected format
		}
	}


  function rankDiffCoeff(player1Rank, player2Rank) {
      let topRank = Math.min(player1Rank, player2Rank);
      let bottomRank = Math.max(player1Rank, player2Rank);
      let metric = (1 / topRank) - (1 / bottomRank);
      return Math.max(0, Math.min(metric, 1)); // Ensure the metric is between 0 and 1
  }
  
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
    const cacheBuster = new Date().getTime(); // Cache-busting technique
    const filePath = fileEntry
      ? `/public_data/tennis_data/${fileEntry.file}?t=${cacheBuster}`
      : "";
    return filePath; // Return the computed file path with cache-buster
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
        row.rank_diff_coeff = rankDiffCoeff(row.WRank, row.LRank);
        row.match_upset = determineMatchOutcome(row.B365W, row.B365L);
		row.formattedDate = formatDate(row.Date);
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

		// Filter out falsy values from the tournaments array
		tournaments.filter(tournament => Boolean(tournament)).forEach((tournament) => {
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
    history.pushState(
      {},
      "",
      "/public_data/tennis_data?" + queryParams.toString()
    );
  }
  	  
  /////// create visualization
  
  function createLabelText(item) {
    return `${item.Winner} (R ${item.WRank}) def ${item.Loser} (R ${item.LRank}) in the ${item.Round} ${item.Wsets}-${item.Lsets}`;
  }
  
  let myChart = null; // Declare this outside of your functions
  
  // VISUALIZE DATA
  
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
  
	let formattedDate = data[0].formattedDate;
	
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
        top: "30%", // Adjusts the space for grid (chart area)
        bottom: "10%", // Increase bottom margin for graphic element
      },
      title: {
        top: "2%",
        show: true,
        text: `{titleColor| ${year} ${tournamentName} Matches by Rank Difference, Outcome & B365 Betting Odds}\n{descColor| Rank Difference = Winner Rank minus Loser Rank}\n{upsetColor| Upset} {favoredColor| Favored} {noOddsColor| No Odds}`,
        left: "center",
        textStyle: {
          fontWeight: "bold",
          fontSize: 16,
          rich: {
            titleColor: {
              color: "#333",
              fontWeight: "bold",
              fontSize: 16,
              padding: [0, 0, 5, 0],
            },
            descColor: {
              color: "#333333",
              fontSize: 14,
              padding: [0, 0, 5, 0], // Top, Right, Bottom, Left padding
            },
            upsetColor: {
              color: "#D85A8A",
              fontWeight: "bold",
              fontSize: 16,
              padding: [0, 0, 0, 0],
            },
            favoredColor: {
              color: "#7FB3D5",
              fontWeight: "bold",
              fontSize: 16,
              padding: [0, 0, 0, 0],
            },
            noOddsColor: {
              color: "#B0B0B0",
              fontWeight: "bold",
              fontSize: 16,
              padding: [0, 0, 0, 0],
            },
          },
        },
      },
      graphic: {
        elements: [
          {
            type: "text",
            style: {
              text: "Created by: @curtispokrant  Source: tennis-data.co.uk",
              fill: "#333", // Text color
              font: "14px Arial", // Font style
            },
            left: 100, // Position from the left edge of the chart
            bottom: 10, // Position from the bottom edge of the chart
          },
          {
            type: "rect", // Type of graphic element - rectangle
            left: "center", // Horizontal position
            top: "middle", // Vertical position
            shape: {
              // Rectangle shape, width and height slightly smaller than the container
              width: myChart.getWidth() - 150,
              height: myChart.getHeight() - 10,
            },
            style: {
              fill: "none", // No fill, makes it transparent inside
              stroke: "#808080", // Stroke color (border color)
              opacity: 0.5,
              lineWidth: 1, // Width of the line (border)
            },
            silent: true, // Non-interactive, doesn't respond to mouse events
          },
        ],
      },
      tooltip: {
        trigger: "item", // Show tooltip when hovering over items
        position: function (point, params, dom, rect, size) {
          // Fixed distances from the bottom left corner of the chart
          const x = 150; // 10 pixels from the left edge of the chart
          const y = size.viewSize[1] - dom.clientHeight - 80; // 10 pixels from the bottom edge
          return [x, y];
        },
        formatter: function (params) {
          const item = data[params.dataIndex];
          return createLabelText(item);
        },
      },
      xAxis: {
        data: xValues, // Hide the X-axis values
        axisLine: {
          show: true,
        },
        splitLine: {
          show: false, // Hides the horizontal grid lines for the y-axis
        },
        axisLabel: {
          show: false,
        },
        axisTick: {
          show: false,
        },
      },
      yAxis: {
        name: "Rank Difference", // Add this line to set the y-axis title
        nameLocation: "middle", // Optional: Adjust the position of the title ('start', 'middle', 'end')
        nameGap: 35, // Optional: Adjust the gap between the title and the axis
        nameTextStyle: {
          // Optional: Style the title (font size, color, etc.)
          fontSize: 12,
          color: "#333",
        },
        splitLine: {
          show: false, // Hides the horizontal grid lines for the y-axis
        },
        axisLine: {
          show: true,
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
    // Call this function with the same data used for the chart
    populateTable(data);
  }
  
  function populateTable(data) {
    const tableBody = document
      .getElementById("data-table")
      .getElementsByTagName("tbody")[0];
  
    // Clear existing rows
    tableBody.innerHTML = "";
  
    data.forEach((item) => {
        let row = tableBody.insertRow();

        // Rank Diff
        let cellRankDiff = row.insertCell();
        cellRankDiff.textContent = item.rank_diff;

        // Odds - Apply background color based on match_upset value
        let cellOdds = row.insertCell();
        cellOdds.textContent = determineMatchOutcome(item.B365W, item.B365L);
        if (item.match_upset === "Upset") {
            cellOdds.style.backgroundColor = "#F875AA"; // Pink color for Upset
        } else if (item.match_upset === "Favored") {
            cellOdds.style.backgroundColor = "#AEDEFC"; // Blue color for Favored
        } else if (item.match_upset === "No Odds") {
            cellOdds.style.backgroundColor = "#D3D3D3"; // Gray color for No bets
        }

        // Winner Name
        let cellWinnerName = row.insertCell();
        cellWinnerName.textContent = item.Winner;

        // Winner Rank
        let cellWinnerRank = row.insertCell();
        cellWinnerRank.textContent = item.WRank;

        // Loser Name
        let cellLoserName = row.insertCell();
        cellLoserName.textContent = item.Loser;

        // Loser Rank
        let cellLoserRank = row.insertCell();
        cellLoserRank.textContent = item.LRank;

        // Date Column
        let cellDate = row.insertCell();
        cellDate.textContent = item.formattedDate; 

        // Round
        let cellRound = row.insertCell();
        cellRound.textContent = item.Round;

        // Sets
        let cellSets = row.insertCell();
        cellSets.textContent = `${item.Wsets}-${item.Lsets}`;

        // Bet365 Odds Winner
        let cellBet365OddsWinner = row.insertCell();
        cellBet365OddsWinner.textContent = item.B365W;

        // Bet365 Odds Loser
        let cellBet365OddsLoser = row.insertCell();
        cellBet365OddsLoser.textContent = item.B365L;
    });
  }

  