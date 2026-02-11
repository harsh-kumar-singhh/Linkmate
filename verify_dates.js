
const today = new Date("2024-01-20T10:00:00Z"); // Mock 'today'
today.setUTCHours(0, 0, 0, 0);

console.log("Mock Today (UTC):", today.toISOString());

const chartData = [];
for (let i = 14; i >= 0; i--) {
    const date = new Date(today);
    date.setUTCDate(today.getUTCDate() - i);

    // Logic from the route.ts
    const dateString = date.toISOString().split('T')[0];

    chartData.push({
        date: dateString,
        label: i === 0 ? "Today" : (i === 14 ? "15d ago" : "")
    });
}

console.log("Generated Chart Data Keys:");
console.log(JSON.stringify(chartData, null, 2));

if (chartData.length === 15) {
    console.log("SUCCESS: Exact 15 items generated.");
} else {
    console.error("FAILURE: Generated " + chartData.length + " items.");
}

const firstDate = chartData[0].date;
const lastDate = chartData[14].date;
console.log(`Range: ${firstDate} to ${lastDate}`);
