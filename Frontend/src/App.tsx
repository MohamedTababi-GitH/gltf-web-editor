import './App.css'
import {ThemeProvider} from "@/components/theme-provider.tsx";
import {BrowserRouter, Route, Routes} from "react-router-dom";
import Home from "@/pages/Home.tsx";

function App() {
    return (
        <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
            <BrowserRouter>
            <Routes>
                <Route path="/" element={<Home/>} />
            </Routes>
            </BrowserRouter>
        </ThemeProvider>
    )
}

export default App
