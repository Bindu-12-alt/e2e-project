// API Base URL
const API_URL = 'http://localhost:5000/api';

// Global variables
let currentUser = null;
let userToken = null;
let map = null;
let marker = null;
let userLocation = { lat: 0, lng: 0 };

// Initialize app on page load
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Page loaded! Checking authentication...');
  checkAuth();
  setupEventListeners();
});

// Check if user is authenticated
function checkAuth() {
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');
  
  console.log('checkAuth called - Token exists:', !!token);
  console.log('checkAuth called - User exists:', !!user);
  
  if (token && user) {
    userToken = token;
    currentUser = JSON.parse(user);
    
    console.log('User loaded:', currentUser);
    console.log('User role:', currentUser.role);
    
    updateUIForLoggedInUser();
    
    // Load dashboard based on user role
    if (currentUser.role === 'mechanic') {
      console.log('Loading mechanic dashboard...');
      loadMechanicDashboard();
    } else if (currentUser.role === 'user') {
      console.log('Loading user dashboard...');
      loadUserDashboard();
    } else if (currentUser.role === 'admin') {
      console.log('Loading ADMIN dashboard...');
      loadAdminDashboard();
    }
  } else {
    console.log('No authentication found');
  }
}

// Update UI for logged in user
function updateUIForLoggedInUser() {
  document.getElementById('authButtons').style.display = 'none';
  document.getElementById('userMenu').style.display = 'flex';
  document.getElementById('userName').textContent = `Hello, ${currentUser.name}!`;
  
  // Hide hero section for logged-in users
  const heroSection = document.getElementById('home');
  if (heroSection) {
    heroSection.style.display = 'none';
  }
  
  if (currentUser.role === 'user') {
    document.getElementById('dashboard').style.display = 'block';
  } else if (currentUser.role === 'mechanic') {
    document.getElementById('mechanicDashboard').style.display = 'block';
  } else if (currentUser.role === 'admin') {
    document.getElementById('adminDashboard').style.display = 'block';
    loadAdminDashboard();
  }
}

// Setup event listeners
function setupEventListeners() {
  // Login form
  document.getElementById('loginForm').addEventListener('submit', handleLogin);
  
  // Register form
  document.getElementById('registerForm').addEventListener('submit', handleRegister);
  
  // Service request form
  document.getElementById('requestForm').addEventListener('submit', handleServiceRequest);
  
  // Role change in register form
  document.getElementById('regRole').addEventListener('change', (e) => {
    const mechanicFields = document.getElementById('mechanicFields');
    mechanicFields.style.display = e.target.value === 'mechanic' ? 'block' : 'none';
  });
}

// Handle Login
async function handleLogin(e) {
  e.preventDefault();
  
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  
  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      showAlert('Login successful! Welcome back!', 'success');
      closeModal('loginModal');
      
      setTimeout(() => {
        location.reload();
      }, 1500);
    } else {
      showAlert(data.message || 'Login failed', 'error');
    }
  } catch (error) {
    showAlert('Network error. Please try again.', 'error');
    console.error('Login error:', error);
  }
}

// Handle Registration
async function handleRegister(e) {
  e.preventDefault();
  
  const name = document.getElementById('regName').value;
  const email = document.getElementById('regEmail').value;
  const phone = document.getElementById('regPhone').value;
  const password = document.getElementById('regPassword').value;
  const role = document.getElementById('regRole').value;
  
  const userData = { name, email, phone, password, role };
  
  // Add mechanic-specific fields if registering as mechanic
  if (role === 'mechanic') {
    userData.specialization = document.getElementById('regSpecialization').value;
    userData.experience = document.getElementById('regExperience').value;
  }
  
  try {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(userData)
    });
    
    const data = await response.json();
    
    if (response.ok) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      showAlert('Registration successful! Welcome to RoadRescue!', 'success');
      closeModal('registerModal');
      
      setTimeout(() => {
        location.reload();
      }, 1500);
    } else {
      showAlert(data.message || 'Registration failed', 'error');
    }
  } catch (error) {
    showAlert('Network error. Please try again.', 'error');
    console.error('Registration error:', error);
  }
}

// Handle Service Request
async function handleServiceRequest(e) {
  e.preventDefault();
  
  if (!userToken) {
    showAlert('Please login first to request service', 'error');
    closeModal('requestModal');
    showLogin();
    return;
  }
  
  const vehicleType = document.getElementById('vehicleType').value;
  const problemDescription = document.getElementById('problemDescription').value;
  const urgency = document.getElementById('urgency').value;
  
  const requestData = {
    vehicleType,
    problemDescription,
    urgency,
    location: {
      latitude: userLocation.lat,
      longitude: userLocation.lng,
      address: 'Current Location'
    }
  };
  
  try {
    const response = await fetch(`${API_URL}/service/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`
      },
      body: JSON.stringify(requestData)
    });
    
    const data = await response.json();
    
    if (response.ok) {
      showAlert(`Request created! ${data.nearbyMechanics.length} mechanics found nearby`, 'success');
      closeModal('requestModal');
      loadUserDashboard();
      
      // Show nearby mechanics
      if (data.nearbyMechanics.length > 0) {
        displayNearbyMechanics(data.nearbyMechanics);
      }
    } else {
      showAlert(data.message || 'Request failed', 'error');
    }
  } catch (error) {
    showAlert('Network error. Please try again.', 'error');
    console.error('Service request error:', error);
  }
}

// Load User Dashboard
async function loadUserDashboard() {
  if (!userToken) return;
  
  try {
    const response = await fetch(`${API_URL}/service/my-requests`, {
      headers: {
        'Authorization': `Bearer ${userToken}`
      }
    });
    
    const data = await response.json();
    
    if (response.ok) {
      displayUserRequests(data.requests);
    }
  } catch (error) {
    console.error('Error loading dashboard:', error);
  }
}

// Display User Requests
function displayUserRequests(requests) {
  const requestsList = document.getElementById('requestsList');
  
  if (requests.length === 0) {
    requestsList.innerHTML = '<p style="text-align: center; color: #666; font-size: 1.2rem;">No service requests yet. Click "Request Mechanic Now" to get started!</p>';
    return;
  }
  
  requestsList.innerHTML = requests.map(req => `
    <div class="request-card">
      <h3>🚗 ${req.vehicleType.toUpperCase()}</h3>
      <p><strong>Problem:</strong> ${req.problemDescription}</p>
      <p><strong>Urgency:</strong> ${req.urgency}</p>
      <p><strong>Location:</strong> ${req.location.latitude.toFixed(4)}, ${req.location.longitude.toFixed(4)}</p>
      <p><strong>Date:</strong> ${new Date(req.createdAt).toLocaleDateString()}</p>
      <span class="status ${req.status}">${req.status}</span>
      ${req.status === 'completed' && req.actualCost ? `
        <div style="margin-top: 15px; padding: 15px; background: linear-gradient(135deg, #43e97b20 0%, #38f9d720 100%); border-radius: 15px;">
          <p><strong>Amount Paid:</strong> ₹${req.actualCost}</p>
        </div>
      ` : ''}
      ${req.status === 'assigned' || req.status === 'in-progress' ? `
        <button class="btn-primary" style="margin-top: 15px; width: 100%;" onclick="trackMechanic('${req._id}')">Track Mechanic</button>
      ` : ''}
      ${req.status === 'completed' && !req.actualCost ? `
        <button class="btn-primary" style="margin-top: 15px; width: 100%;" onclick="makePayment('${req._id}', ${req.estimatedCost || 500})">Pay ₹${req.estimatedCost || 500}</button>
      ` : ''}
    </div>
  `).join('');
}

// Load Mechanic Dashboard
async function loadMechanicDashboard() {
  if (!userToken) return;
  
  try {
    const response = await fetch(`${API_URL}/mechanic/my-jobs`, {
      headers: {
        'Authorization': `Bearer ${userToken}`
      }
    });
    
    const data = await response.json();
    
    if (response.ok) {
      displayMechanicJobs(data.jobs);
    }
  } catch (error) {
    console.error('Error loading mechanic dashboard:', error);
  }
}

// Display Mechanic Jobs
function displayMechanicJobs(jobs) {
  const jobsList = document.getElementById('jobsList');
  
  if (jobs.length === 0) {
    jobsList.innerHTML = '<p style="text-align: center; color: #666; font-size: 1.2rem;">No jobs assigned yet. Update your location to receive requests!</p>';
    return;
  }
  
  jobsList.innerHTML = jobs.map(job => `
    <div class="job-card">
      <h3>🔧 ${job.vehicleType.toUpperCase()}</h3>
      <p><strong>Customer:</strong> ${job.userId.name}</p>
      <p><strong>Phone:</strong> ${job.userId.phone}</p>
      <p><strong>Problem:</strong> ${job.problemDescription}</p>
      <p><strong>Location:</strong> ${job.location.latitude.toFixed(4)}, ${job.location.longitude.toFixed(4)}</p>
      <p><strong>Urgency:</strong> ${job.urgency}</p>
      <span class="status ${job.status}">${job.status}</span>
      ${job.status === 'assigned' ? `
        <button class="btn-primary" style="margin-top: 15px; width: 100%;" onclick="updateJobStatus('${job._id}', 'in-progress')">Start Job</button>
      ` : ''}
      ${job.status === 'in-progress' ? `
        <button class="btn-primary" style="margin-top: 15px; width: 100%;" onclick="updateJobStatus('${job._id}', 'completed')">Complete Job</button>
      ` : ''}
      <button class="btn-secondary" style="margin-top: 10px; width: 100%;" onclick="openInMaps(${job.location.latitude}, ${job.location.longitude})">Get Directions</button>
    </div>
  `).join('');
}

// Update Job Status (Mechanic)
async function updateJobStatus(jobId, status) {
  try {
    const response = await fetch(`${API_URL}/service/${jobId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`
      },
      body: JSON.stringify({ status })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      showAlert(`Job status updated to ${status}!`, 'success');
      loadMechanicDashboard();
    } else {
      showAlert(data.message || 'Update failed', 'error');
    }
  } catch (error) {
    showAlert('Network error. Please try again.', 'error');
    console.error('Status update error:', error);
  }
}

// Toggle Mechanic Availability
async function toggleAvailability() {
  try {
    const response = await fetch(`${API_URL}/mechanic/availability`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${userToken}`
      }
    });
    
    const data = await response.json();
    
    if (response.ok) {
      showAlert(`You are now ${data.mechanic.isAvailable ? 'AVAILABLE' : 'UNAVAILABLE'}`, 'success');
    }
  } catch (error) {
    showAlert('Network error. Please try again.', 'error');
  }
}

// Update Mechanic Location
async function updateLocation() {
  if (!navigator.geolocation) {
    showAlert('Geolocation is not supported by your browser', 'error');
    return;
  }
  
  navigator.geolocation.getCurrentPosition(async (position) => {
    const latitude = position.coords.latitude;
    const longitude = position.coords.longitude;
    
    try {
      const response = await fetch(`${API_URL}/mechanic/location`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify({ latitude, longitude })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        showAlert('Location updated successfully!', 'success');
      } else {
        showAlert(data.message || 'Update failed', 'error');
      }
    } catch (error) {
      showAlert('Network error. Please try again.', 'error');
    }
  }, (error) => {
    showAlert('Unable to retrieve your location', 'error');
  });
}

// Make Payment with Razorpay
async function makePayment(serviceRequestId, amount) {
  try {
    // Create order
    const orderResponse = await fetch(`${API_URL}/payment/create-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`
      },
      body: JSON.stringify({ serviceRequestId, amount })
    });
    
    const orderData = await orderResponse.json();
    
    if (!orderResponse.ok) {
      showAlert('Payment initiation failed', 'error');
      return;
    }
    
    // Check if Razorpay is loaded
    if (typeof Razorpay === 'undefined') {
      showAlert('Payment system not loaded. Please refresh the page.', 'error');
      return;
    }
    
    // Razorpay options
    const options = {
      key: 'rzp_test_S80X6FmLfgP6Lk', // REPLACE WITH YOUR RAZORPAY TEST KEY
      amount: orderData.order.amount,
      currency: 'INR',
      name: 'RoadRescue',
      description: 'Vehicle Breakdown Service Payment',
      order_id: orderData.order.id,
      handler: async function (response) {
        // Verify payment
        try {
          const verifyResponse = await fetch(`${API_URL}/payment/verify`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${userToken}`
            },
            body: JSON.stringify({
              razorpayPaymentId: response.razorpay_payment_id,
              razorpayOrderId: response.razorpay_order_id,
              paymentId: orderData.paymentId
            })
          });
          
          if (verifyResponse.ok) {
            showAlert('Payment successful! Thank you!', 'success');
            loadUserDashboard();
          } else {
            showAlert('Payment verification failed', 'error');
          }
        } catch (error) {
          showAlert('Payment verification error', 'error');
          console.error('Verify error:', error);
        }
      },
      prefill: {
        name: currentUser.name,
        email: currentUser.email,
        contact: currentUser.phone || ''
      },
      theme: {
        color: '#667eea'
      },
      modal: {
        ondismiss: function() {
          showAlert('Payment cancelled', 'error');
        }
      }
    };
    
    const razorpay = new Razorpay(options);
    razorpay.open();
    
    // Handle payment errors
    razorpay.on('payment.failed', function (response) {
      showAlert('Payment failed: ' + response.error.description, 'error');
      console.error('Payment failed:', response.error);
    });
    
  } catch (error) {
    showAlert('Payment error. Please try again.', 'error');
    console.error('Payment error:', error);
  }
}

// Initialize Google Map
function initMap() {
  if (!navigator.geolocation) {
    document.getElementById('locationText').textContent = 'Geolocation not supported';
    return;
  }
  
  navigator.geolocation.getCurrentPosition((position) => {
    userLocation = {
      lat: position.coords.latitude,
      lng: position.coords.longitude
    };
    
    map = new google.maps.Map(document.getElementById('map'), {
      center: userLocation,
      zoom: 15,
      styles: [
        {
          featureType: 'all',
          elementType: 'geometry',
          stylers: [{ color: '#f5f7fa' }]
        },
        {
          featureType: 'water',
          elementType: 'geometry',
          stylers: [{ color: '#a2daf3' }]
        }
      ]
    });
    
    marker = new google.maps.Marker({
      position: userLocation,
      map: map,
      title: 'Your Location',
      animation: google.maps.Animation.DROP,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: '#667eea',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 3
      }
    });
    
    document.getElementById('locationText').textContent = 
      `Location: ${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}`;
    
  }, (error) => {
    document.getElementById('locationText').textContent = 'Unable to get location';
    console.error('Geolocation error:', error);
  });
}

// Display Nearby Mechanics on Map
function displayNearbyMechanics(mechanics) {
  if (!map) return;
  
  mechanics.forEach(mechanic => {
    if (mechanic.currentLocation) {
      new google.maps.Marker({
        position: {
          lat: mechanic.currentLocation.latitude,
          lng: mechanic.currentLocation.longitude
        },
        map: map,
        title: mechanic.userId.name,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: '#43e97b',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2
        }
      });
    }
  });
}

// Track Mechanic
function trackMechanic(requestId) {
  showAlert('Real-time tracking feature coming soon!', 'success');
  // TODO: Implement real-time tracking using WebSocket or polling
}

// Open location in Google Maps
function openInMaps(lat, lng) {
  window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
}

// ================= MODAL FUNCTIONS =================

function showLogin() {
  closeAllModals();
  document.getElementById('loginModal').style.display = 'block';
}

function showRegister() {
  closeAllModals();
  document.getElementById('registerModal').style.display = 'block';
}

function showRequestForm() {
  if (!userToken) {
    showAlert('Please login first to request service', 'error');
    showLogin();
    return;
  }
  
  closeAllModals();
  document.getElementById('requestModal').style.display = 'block';
  
  // Initialize map after modal is visible
  setTimeout(() => {
    initMap();
  }, 300);
}

function closeModal(modalId) {
  document.getElementById(modalId).style.display = 'none';
}

function closeAllModals() {
  document.querySelectorAll('.modal').forEach(modal => {
    modal.style.display = 'none';
  });
}

// Close modal when clicking outside
window.onclick = function(event) {
  if (event.target.classList.contains('modal')) {
    event.target.style.display = 'none';
  }
};

// Logout
function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  showAlert('Logged out successfully!', 'success');
  setTimeout(() => {
    location.reload();
  }, 1000);
}

// Show Alert
function showAlert(message, type) {
  const alertDiv = document.createElement('div');
  alertDiv.className = `alert ${type}`;
  alertDiv.textContent = message;
  alertDiv.style.position = 'fixed';
  alertDiv.style.top = '80px';
  alertDiv.style.right = '20px';
  alertDiv.style.zIndex = '10000';
  alertDiv.style.minWidth = '300px';
  
  document.body.appendChild(alertDiv);
  
  setTimeout(() => {
    alertDiv.remove();
  }, 4000);
}

// ==================== ADMIN FUNCTIONS ====================

// Load Admin Dashboard
async function loadAdminDashboard() {
  if (!userToken || currentUser.role !== 'admin') return;
  
  try {
    // Load statistics
    const statsResponse = await fetch(`${API_URL}/admin/stats`, {
      headers: { 'Authorization': `Bearer ${userToken}` }
    });
    
    if (statsResponse.ok) {
      const data = await statsResponse.json();
      displayAdminStats(data.stats);
    }
    
    // Load initial tab (users)
    showAdminTab('users');
    
  } catch (error) {
    console.error('Error loading admin dashboard:', error);
  }
}

// Display Admin Statistics
function displayAdminStats(stats) {
  document.getElementById('totalUsers').textContent = stats.totalUsers;
  document.getElementById('totalMechanics').textContent = stats.totalMechanics;
  document.getElementById('totalRequests').textContent = stats.totalRequests;
  document.getElementById('completedRequests').textContent = stats.completedRequests;
  document.getElementById('pendingRequests').textContent = stats.pendingRequests;
  document.getElementById('totalRevenue').textContent = `₹${stats.totalRevenue}`;
}

// Show Admin Tab
// Show Admin Tab
async function showAdminTab(tabName, buttonElement) {
  // Update tab buttons - remove active from all
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  // Add active to clicked button
  if (buttonElement) {
    buttonElement.classList.add('active');
  }
  
  // Hide all panels
  document.querySelectorAll('.admin-tab-panel').forEach(panel => {
    panel.classList.remove('active');
  });
  
  // Show selected panel
  const panel = document.getElementById(`${tabName}Tab`);
  if (panel) {
    panel.classList.add('active');
  }
  
  // Load data
  try {
    const response = await fetch(`${API_URL}/admin/${tabName}`, {
      headers: { 'Authorization': `Bearer ${userToken}` }
    });
    
    const data = await response.json();
    
    switch(tabName) {
      case 'users':
        displayUsers(data.users);
        break;
      case 'mechanics':
        displayMechanics(data.mechanics);
        break;
      case 'requests':
        displayAllRequests(data.requests);
        break;
      case 'payments':
        displayPayments(data.payments);
        break;
    }
  } catch (error) {
    console.error(`Error loading ${tabName}:`, error);
  }
}

// Display Users Table
function displayUsers(users) {
  const panel = document.getElementById('usersTab');
  
  if (users.length === 0) {
    panel.innerHTML = '<p style="text-align: center; padding: 40px;">No users found</p>';
    return;
  }
  
  panel.innerHTML = `
    <div class="admin-table">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Role</th>
            <th>Joined</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${users.map(user => `
            <tr>
              <td>${user.name}</td>
              <td>${user.email}</td>
              <td>${user.phone}</td>
              <td><span class="status ${user.role}">${user.role}</span></td>
              <td>${new Date(user.createdAt).toLocaleDateString()}</td>
              <td>
                <button class="action-btn delete" onclick="deleteUser('${user._id}')">Delete</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// Display Mechanics Table
// Display Mechanics Table
function displayMechanics(mechanics) {
  const panel = document.getElementById('mechanicsTab');
  
  if (mechanics.length === 0) {
    panel.innerHTML = '<p style="text-align: center; padding: 40px;">No mechanics found</p>';
    return;
  }
  
  panel.innerHTML = `
    <div class="admin-table">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Specialization</th>
            <th>Experience</th>
            <th>Available</th>
            <th>Rating</th>
            <th>Services</th>
          </tr>
        </thead>
        <tbody>
          ${mechanics.map(mech => {
            // Safety check - skip if userId is missing
            if (!mech.userId) {
              return '';
            }
            return `
              <tr>
                <td>${mech.userId.name || 'N/A'}</td>
                <td>${mech.userId.email || 'N/A'}</td>
                <td>${mech.userId.phone || 'N/A'}</td>
                <td>${mech.specialization}</td>
                <td>${mech.experience} years</td>
                <td><span class="status ${mech.isAvailable ? 'completed' : 'pending'}">${mech.isAvailable ? 'Yes' : 'No'}</span></td>
                <td>⭐ ${mech.rating.toFixed(1)}</td>
                <td>${mech.completedServices}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// Display All Requests Table
// Display All Requests Table
function displayAllRequests(requests) {
  const panel = document.getElementById('requestsTab');
  
  if (requests.length === 0) {
    panel.innerHTML = '<p style="text-align: center; padding: 40px;">No requests found</p>';
    return;
  }
  
  panel.innerHTML = `
    <div class="admin-table">
      <table>
        <thead>
          <tr>
            <th>User</th>
            <th>Vehicle</th>
            <th>Problem</th>
            <th>Mechanic</th>
            <th>Status</th>
            <th>Urgency</th>
            <th>Date</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${requests.map(req => {
            // Safety checks
            const userName = req.userId ? req.userId.name : 'Unknown';
            const userPhone = req.userId ? req.userId.phone : 'N/A';
            const mechanicName = req.mechanicId && req.mechanicId.userId ? req.mechanicId.userId.name : 'Not assigned';
            
            return `
              <tr>
                <td>${userName}<br><small>${userPhone}</small></td>
                <td>${req.vehicleType}</td>
                <td>${req.problemDescription.substring(0, 50)}...</td>
                <td>${mechanicName}</td>
                <td><span class="status ${req.status}">${req.status}</span></td>
                <td><span class="status ${req.urgency}">${req.urgency}</span></td>
                <td>${new Date(req.createdAt).toLocaleDateString()}</td>
                <td>
                  ${req.status !== 'completed' ? `
  <button class="action-btn edit" onclick="completeRequestWithAmount('${req._id}')">Complete</button>
` : ''}
                  ${req.status === 'pending' ? `
                    <button class="action-btn delete" onclick="updateRequestStatus('${req._id}', 'cancelled')">Cancel</button>
                  ` : ''}
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}
// Display Payments Table
function displayPayments(payments) {
  const panel = document.getElementById('paymentsTab');
  
  if (payments.length === 0) {
    panel.innerHTML = '<p style="text-align: center; padding: 40px;">No payments found</p>';
    return;
  }
  
  panel.innerHTML = `
    <div class="admin-table">
      <table>
        <thead>
          <tr>
            <th>User</th>
            <th>Amount</th>
            <th>Status</th>
            <th>Razorpay Payment ID</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          ${payments.map(pay => `
            <tr>
              <td>${pay.userId.name}<br><small>${pay.userId.email}</small></td>
              <td>₹${pay.amount}</td>
              <td><span class="status ${pay.status}">${pay.status}</span></td>
              <td><small>${pay.razorpayPaymentId || 'N/A'}</small></td>
              <td>${new Date(pay.createdAt).toLocaleDateString()}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// Delete User
async function deleteUser(userId) {
  if (!confirm('Are you sure you want to delete this user?')) return;
  
  try {
    const response = await fetch(`${API_URL}/admin/users/${userId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${userToken}` }
    });
    
    if (response.ok) {
      showAlert('User deleted successfully', 'success');
      showAdminTab('users');
    }
  } catch (error) {
    showAlert('Failed to delete user', 'error');
  }
}

// Update Request Status (Admin)
async function updateRequestStatus(requestId, status) {
  try {
    const response = await fetch(`${API_URL}/admin/requests/${requestId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`
      },
      body: JSON.stringify({ status })
    });
    
    if (response.ok) {
      showAlert(`Request ${status} successfully`, 'success');
      showAdminTab('requests');
      loadAdminDashboard(); // Refresh stats
    }
  } catch (error) {
    showAlert('Failed to update request', 'error');
  }
}

// Complete Request with Custom Amount
async function completeRequestWithAmount(requestId) {
  const amount = prompt('Enter service cost (in ₹):', '500');
  
  if (!amount || isNaN(amount) || amount <= 0) {
    showAlert('Please enter a valid amount', 'error');
    return;
  }
  
  try {
    const response = await fetch(`${API_URL}/admin/requests/${requestId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`
      },
      body: JSON.stringify({ 
        status: 'completed',
        estimatedCost: parseInt(amount)
      })
    });
    
    if (response.ok) {
      showAlert(`Request completed with amount ₹${amount}`, 'success');
      showAdminTab('requests', null);
      loadAdminDashboard(); // Refresh stats
    } else {
      showAlert('Failed to update request', 'error');
    }
  } catch (error) {
    showAlert('Failed to update request', 'error');
    console.error('Error:', error);
  }
}

