document.addEventListener("DOMContentLoaded", () => {
	// === Animate circular progress ===
	const progressCircle = document.querySelector(".progress-ring__progress");
	if (progressCircle) {
		const radius = progressCircle.r.baseVal.value;
		const circumference = 2 * Math.PI * radius;
		const progress = 75; // % value (demo)

		progressCircle.style.strokeDasharray = `${circumference} ${circumference}`;
		progressCircle.style.strokeDashoffset = circumference - (progress / 100) * circumference;
	}

	// === Animate linear progress bars ===
	document.querySelectorAll(".goal-card .progress").forEach((bar) => {
		const width = bar.style.width;
		bar.style.width = "0";
		setTimeout(() => {
			bar.style.width = width;
		}, 300);
	});

	// === Statistics Chart ===
	const ctx = document.getElementById("progressChart");
	if (ctx && typeof Chart !== 'undefined') {
		const chart = new Chart(ctx, {
			type: "line",
			data: {
				labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
				datasets: [{
					label: "Progress",
					data: [10, 20, 30, 25, 40, 55, 60],
					borderColor: "#d4af37",
					tension: 0.4
				}]
			},
			options: {
				plugins: { legend: { display: false } },
				scales: {
					x: { ticks: { color: "#bbb" }, grid: { color: "#222" } },
					y: { ticks: { color: "#bbb" }, grid: { color: "#222" } }
				}
			}
		});
	}

	// === Animate 72% ring ===
	const circle = document.querySelector(".circle-progress");
	if (circle) {
		const circleRadius = circle.r.baseVal.value;
		const circleCircum = 2 * Math.PI * circleRadius;
		const percent = 72;

		circle.style.strokeDasharray = `${circleCircum}`;
		circle.style.strokeDashoffset = circleCircum - (percent / 100) * circleCircum;
	}
});