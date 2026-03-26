import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { ListProvider } from './context/ListContext'
import { I18nProvider } from './context/I18nContext'
import { LocalCacheProvider } from './context/LocalCacheContext'
import { ThemeProvider } from './context/ThemeContext'
import { PushNotificationProvider } from './context/PushNotificationContext'
import HomePage from './components/HomePage'
import ListPage from './components/ListPage'

function App() {
  return (
    <ThemeProvider>
      <I18nProvider>
        <LocalCacheProvider>
          <ListProvider>
            <PushNotificationProvider>
              <Router>
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/list/:listId" element={<ListPage />} />
                </Routes>
              </Router>
            </PushNotificationProvider>
          </ListProvider>
        </LocalCacheProvider>
      </I18nProvider>
    </ThemeProvider>
  )
}

export default App