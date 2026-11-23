import React, { useState, useEffect } from 'react';
import { Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom';
import HomePage from './routes/homepage';
import About from './components/About.jsx';
import LoginPage from './routes/loginPage';
import ShowUserInfo from './routes/ShowUserInfo.jsx';
import AddUserInfo from './routes/addUserInfo';
import SearchTrainInfo from './routes/searchTrainInfo';
import BookTrain from './routes/bookTrain';
import BookSeat from './routes/bookSeat';
import TicketBooking from './routes/ticketBooking';
import Unavailable from './routes/Unavailable';

import NavBar from './components/NavBar';
import SiteFooter from './components/SiteFooter';
import './styles/theme.css';
import { AppProvider } from './components/AppContext';
import { LangProvider } from './i18n';

// Scroll to top on every page change
const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
};

// Old URLs that now live inside the account page
const AccountRedirect = () => {
  const { id } = useParams();
  return <Navigate to={`/users/${id}`} replace />;
};

const AppContent = ({ setAuth }) => (
  <div className="app">
    <ScrollToTop />
    <NavBar />
    <main className="app-main">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<About />} />
        <Route path="/users/login" element={<LoginPage setAuth={setAuth} />} />
        <Route path="/users/:id/update" element={<AccountRedirect />} />
        <Route path="/users/:id/tickets" element={<AccountRedirect />} />
        <Route path="/users/:id" element={<ShowUserInfo />} />
        <Route path="/users" element={<AddUserInfo />} />
        <Route path="/trains" element={<SearchTrainInfo />} />
        <Route path="/booking/train/search" element={<BookTrain />} />
        <Route path="/bookseat" element={<BookSeat />} />
        <Route path="/booking/ticket" element={<TicketBooking />} />

        {/* These pages relied on the retired EC2 server; the current API has no endpoints for them */}
        <Route path="/trainInfo" element={<Unavailable title="Train information" />} />
        <Route path="/train/:id" element={<Unavailable title="Train route" />} />
        <Route path="/search" element={<Unavailable title="Search" />} />
        <Route path="/review" element={<Unavailable title="Reviews" />} />
        <Route path="/admin" element={<Unavailable title="Admin" />} />
        <Route path="*" element={<Unavailable title="Page not found" />} />
      </Routes>
    </main>
    <SiteFooter />
  </div>
);

const App = () => {
  const [, setAuthenticated] = useState(false);

  const setAuth = (boolean) => setAuthenticated(boolean);

  useEffect(() => {
    setAuth(!!localStorage.getItem('token'));
  }, []);

  return (
    <LangProvider>
      <AppProvider>
        <AppContent setAuth={setAuth} />
      </AppProvider>
    </LangProvider>
  );
};

export default App;
