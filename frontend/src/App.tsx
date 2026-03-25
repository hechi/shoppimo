import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { ListProvider } from './context/ListContext'
import { I18nProvider } from './context/I18nContext'
import { LocalCacheProvider } from './context/LocalCacheContext'
import HomePage from './components/HomePage'
import ListPage from './components/ListPage'

function App() {
  return (
    <I18nProvider>
      <LocalCacheProvider>
        <ListProvider>
          <Router>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/list/:listId" element={<ListPage />} />
            </Routes>
          </Router>
        </ListProvider>
      </LocalCacheProvider>
    </I18nProvider>
  )
}

export default App