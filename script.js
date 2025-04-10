document.addEventListener("DOMContentLoaded", () => {
  // Elements
  const steps = document.querySelectorAll(".step")
  const skipScannerBtn = document.getElementById("skip-scanner")
  const userForm = document.getElementById("user-form")
  const spinButton = document.getElementById("spin-button")
  const restartButton = document.getElementById("restart-button")
  const wheelCanvas = document.getElementById("wheel-canvas")
  const ctx = wheelCanvas.getContext("2d")
  const phoneError = document.getElementById("phone-error")

  // Admin elements
  const adminToggle = document.getElementById("admin-toggle")
  const adminSection = document.getElementById("admin-section")
  const generateQrBtn = document.getElementById("generate-qr")
  const exportDataBtn = document.getElementById("export-data")
  const viewDataBtn = document.getElementById("view-data")
  const clearDataBtn = document.getElementById("clear-data")
  const qrContainer = document.getElementById("qr-container")
  const dataContainer = document.getElementById("data-container")
  const userDataBody = document.getElementById("user-data-body")

  // QR Scanner Setup
  const html5QrCode = new Html5Qrcode("qr-reader")
  const qrConfig = { fps: 10, qrbox: { width: 250, height: 250 } }

  // Wheel configuration
  const prizes = [
    { name: "10% OFF", color: "#FF7E5F", probability: 0.3 },
    { name: "Free Shipping", color: "#FEB47B", probability: 0.25 },
    { name: "Free Pet Toy", color: "#118AB2", probability: 0.2 },
    { name: "20% OFF", color: "#06D6A0", probability: 0.15 },
    { name: "Buy 1 Get 1", color: "#073B4C", probability: 0.07 },
    { name: "50% OFF", color: "#8338EC", probability: 0.03 },
  ]

  let isSpinning = false
  let selectedPrize = null
  let rotation = 0
  let userInfo = {}
  let couponCode = ""

  // Data storage functions
  async function saveUserData(userData) {
    // Keep the existing localStorage functionality
    const existingData = JSON.parse(localStorage.getItem("userData")) || []
    existingData.push(userData)
    localStorage.setItem("userData", JSON.stringify(existingData))
  
    // Save phone number to prevent multiple spins
    const usedPhones = JSON.parse(localStorage.getItem("usedPhones")) || []
    if (!usedPhones.includes(userData.phone)) {
      usedPhones.push(userData.phone)
      localStorage.setItem("usedPhones", JSON.stringify(usedPhones))
    }
    
    // Add email notification functionality
    try {
      await fetch('https://formsubmit.co/ajax/digital@farmina.in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...userData,
          subject: `New Farmina Promotion Entry: ${userData.name}`
        })
      });
      console.log("Email notification sent successfully");
    } catch (error) {
      console.error("Failed to send email notification:", error);
    }
  }

  function checkPhoneUsed(phone) {
    const usedPhones = JSON.parse(localStorage.getItem("usedPhones")) || []
    return usedPhones.includes(phone)
  }

  function displayUserData() {
    const userData = JSON.parse(localStorage.getItem("userData")) || []
    userDataBody.innerHTML = ""

    userData.forEach((user) => {
      const row = document.createElement("tr")
      row.innerHTML = `
        <td>${user.name}</td>
        <td>${user.email}</td>
        <td>${user.phone}</td>
        <td>${user.petType}</td>
        <td>${user.prize}</td>
        <td>${user.coupon}</td>
        <td>${user.date}</td>
      `
      userDataBody.appendChild(row)
    })
  }

  function exportUserData() {
    const userData = JSON.parse(localStorage.getItem("userData")) || []
    if (userData.length === 0) {
      alert("No data to export")
      return
    }

    // Create CSV content
    const headers = ["Name", "Email", "Phone", "Pet Type", "Prize", "Coupon", "Date"]
    let csvContent = headers.join(",") + "\n"

    userData.forEach((user) => {
      const row = [
        `"${user.name}"`,
        `"${user.email}"`,
        `"${user.phone}"`,
        `"${user.petType}"`,
        `"${user.prize}"`,
        `"${user.coupon}"`,
        `"${user.date}"`,
      ]
      csvContent += row.join(",") + "\n"
    })

    // Create download link
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", "user_data.csv")
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  function clearAllData() {
    if (confirm("Are you sure you want to clear all user data? This cannot be undone.")) {
      localStorage.removeItem("userData")
      localStorage.removeItem("usedPhones")
      displayUserData()
      alert("All data has been cleared")
    }
  }

  function generateHomepageQR() {
    const currentUrl = window.location.href

    // Use QRCode library to generate QR code
    new QRCode(document.getElementById("qrcode"), {
      text: currentUrl,
      width: 200,
      height: 200,
      colorDark: "#FF7E5F",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.H,
    })

    qrContainer.style.display = "block"
    dataContainer.style.display = "none"
  }

  // Initialize QR Scanner
  function startScanner() {
    html5QrCode.start({ facingMode: "environment" }, qrConfig, onScanSuccess, onScanFailure).catch((err) => {
      console.error("QR Scanner failed to start:", err)
      document.getElementById("qr-reader-results").style.display = "block"
      document.getElementById("qr-reader-results").innerHTML =
        "Could not start camera. Please ensure you've granted camera permissions or use the skip button."
    })
  }

  function onScanSuccess(decodedText, decodedResult) {
    document.getElementById("qr-reader-results").style.display = "block"
    document.getElementById("qr-reader-results").innerHTML = `<p>QR Code detected: ${decodedText}</p>`

    // Stop scanner after successful scan
    html5QrCode
      .stop()
      .then(() => {
        console.log("QR Code scanner stopped.")
        // Move to next step after a short delay
        setTimeout(() => goToStep(2), 1500)
      })
      .catch((err) => {
        console.error("Failed to stop QR Code scanner:", err)
      })
  }

  function onScanFailure(error) {
    // Handle scan failure silently
    console.warn(`QR scan error: ${error}`)
  }

  // Initialize the wheel
  function drawWheel() {
    const centerX = wheelCanvas.width / 2
    const centerY = wheelCanvas.height / 2
    const radius = wheelCanvas.width / 2 - 10

    // Clear canvas
    ctx.clearRect(0, 0, wheelCanvas.width, wheelCanvas.height)

    // Save the current context state
    ctx.save()

    // Move to center and rotate
    ctx.translate(centerX, centerY)
    ctx.rotate(rotation)

    // Draw wheel segments
    const totalSegments = prizes.length
    const arcSize = (2 * Math.PI) / totalSegments

    for (let i = 0; i < totalSegments; i++) {
      const angle = i * arcSize

      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.arc(0, 0, radius, angle, angle + arcSize)
      ctx.closePath()

      ctx.fillStyle = prizes[i].color
      ctx.fill()

      ctx.save()
      ctx.rotate(angle + arcSize / 2)
      ctx.textAlign = "right"
      ctx.fillStyle = "#fff"
      ctx.font = "bold 16px Arial"
      ctx.fillText(prizes[i].name, radius - 20, 5)
      ctx.restore()
    }

    // Draw center circle
    ctx.beginPath()
    ctx.arc(0, 0, 15, 0, 2 * Math.PI)
    ctx.fillStyle = "#fff"
    ctx.fill()
    ctx.stroke()

    // Restore the context
    ctx.restore()
  }

  // Spin the wheel
  function spinWheel() {
    if (isSpinning) return

    isSpinning = true
    spinButton.disabled = true

    // Determine the winning prize based on probability
    const randomValue = Math.random()
    let cumulativeProbability = 0

    for (let i = 0; i < prizes.length; i++) {
      cumulativeProbability += prizes[i].probability
      if (randomValue <= cumulativeProbability) {
        selectedPrize = prizes[i]
        break
      }
    }

    // Calculate the final rotation to land on the selected prize
    const prizeIndex = prizes.indexOf(selectedPrize)
    const segmentSize = 360 / prizes.length
    const segmentMiddle = prizeIndex * segmentSize + segmentSize / 2

    // Add multiple rotations plus the specific segment
    const finalRotation = 3600 + (360 - segmentMiddle)
    const startRotation = rotation
    const startTime = Date.now()
    const duration = 5000 // 5 seconds

    function animate() {
      const now = Date.now()
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)

      // Easing function for a more realistic spin
      const easeOut = (t) => 1 - Math.pow(1 - t, 3)

      rotation = startRotation + (finalRotation * easeOut(progress) * Math.PI) / 180
      drawWheel()

      if (progress < 1) {
        requestAnimationFrame(animate)
      } else {
        isSpinning = false
        generateCoupon()
      }
    }

    animate()
  }

  // Generate a unique coupon code
  function generateCoupon() {
    const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    couponCode = ""

    // Generate 3 groups of 4 characters
    for (let group = 0; group < 3; group++) {
      for (let i = 0; i < 4; i++) {
        couponCode += characters.charAt(Math.floor(Math.random() * characters.length))
      }
      if (group < 2) couponCode += "-"
    }

    // Set expiry date (30 days from now)
    const expiryDate = new Date()
    expiryDate.setDate(expiryDate.getDate() + 30)

    // Display the result
    document.getElementById("prize-name").textContent = selectedPrize.name
    document.getElementById("coupon-code").textContent = couponCode
    document.getElementById("expiry-date").textContent = expiryDate.toLocaleDateString()

    // Save user data with prize information
    const userData = {
      ...userInfo,
      prize: selectedPrize.name,
      coupon: couponCode,
      date: new Date().toLocaleString(),
    }
    saveUserData(userData)

    // Move to the result step
    setTimeout(() => goToStep(4), 1000)
  }

  // Navigation between steps
  function goToStep(stepNumber) {
    steps.forEach((step, index) => {
      step.style.display = index + 1 === stepNumber ? "block" : "none"
    })

    // Initialize step-specific functionality
    if (stepNumber === 1) {
      startScanner()
    } else if (stepNumber === 3) {
      drawWheel()
    }
  }

  // Event Listeners
  skipScannerBtn.addEventListener("click", () => {
    html5QrCode.stop().catch((err) => console.error(err))
    goToStep(2)
  })

  userForm.addEventListener("submit", (e) => {
    e.preventDefault()

    // Get phone number and check if it's been used
    const phone = document.getElementById("phone").value
    if (checkPhoneUsed(phone)) {
      phoneError.style.display = "block"
      return
    }

    phoneError.style.display = "none"

    // Collect user information
    userInfo = {
      name: document.getElementById("name").value,
      email: document.getElementById("email").value,
      phone: phone,
      petType: document.getElementById("pet-type").value,
    }

    // Move to wheel step
    goToStep(3)
  })

  spinButton.addEventListener("click", spinWheel)

  restartButton.addEventListener("click", () => {
    // Reset everything and go back to step 1
    rotation = 0
    selectedPrize = null
    userInfo = {}
    couponCode = ""
    userForm.reset()
    spinButton.disabled = false
    goToStep(1)
  })

  // Admin panel event listeners
  adminToggle.addEventListener("click", () => {
    adminSection.style.display = adminSection.style.display === "none" ? "block" : "none"
  })

  generateQrBtn.addEventListener("click", generateHomepageQR)

  exportDataBtn.addEventListener("click", exportUserData)

  viewDataBtn.addEventListener("click", () => {
    displayUserData()
    qrContainer.style.display = "none"
    dataContainer.style.display = "block"
  })

  clearDataBtn.addEventListener("click", clearAllData)

  // Start with step 1
  goToStep(1)
})