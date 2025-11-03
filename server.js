const express = require('express');
const path = require('path');
const app = express();

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// DISABLE CACHE IN DEVELOPMENT
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  console.log(` ${req.method} ${req.url}`);
  next();
});

app.use(express.static(path.join(__dirname, 'public')));


// === ROUTES ===
app.get('/', (req, res) => {
  console.log('🏠 Serving index.html');
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/signin', (req, res) => {
  console.log(' Serving signin.html');
  res.sendFile(path.join(__dirname, 'public', 'signin.html'));
});

app.get('/partner-signin', (req, res) => {
  console.log(' Serving partner-signin.html');
  res.sendFile(path.join(__dirname, 'public', 'partner-signin.html'));
});

app.post('/signin', (req, res) => {
  const { email, accessCode, password, userType } = req.body;
  console.log(`User sign in attempt: ${email} (${userType})`);

  // TODO: add real validation/auth here (check DB or compare accessCode)
  const loginOk = true; // placeholder; implement real checks

  if (loginOk) {
    // redirect browser to dashboard HTML
    return res.redirect('/ambassador-dashboard.html');
  } else {
    // if fail, redirect back with a query param or render error page
    return res.redirect('/signin?error=1');
  }
});

app.post('/partner-signin',(req,res)=>{
  const { email, accessCode, password, userType } = req.body;
  console.log(`User sign in attempt: ${email} (${userType})`);

  const loginOk = true;

  if (loginOk) {
    // redirect browser to dashboard HTML
    return res.redirect('/partner-dashboard.html');
  } 

  else {
    // if fail, redirect back with a query param or render error page
    return res.redirect('/signin?error=1');
  }
})



const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n Server running at http://localhost:${PORT}`);
  console.log(`🔗 Open: http://localhost:${PORT}\n`);
});
