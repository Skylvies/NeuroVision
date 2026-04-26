import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HeroUIProvider } from "@heroui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AnimatePresence } from "framer-motion";
import { AuthProvider } from "./context/AuthContext.tsx";
import Navbar from "./components/common/Navbar.tsx";
import Footer from "./components/common/Footer.tsx";
import Home from "./pages/Home.tsx";
import Analysis from "./pages/Analysis.tsx";
import History from "./pages/History.tsx";
import Login from "./pages/Login.tsx";
import Register from "./pages/Register.tsx";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <HeroUIProvider>
        <BrowserRouter>
          <AuthProvider>
            <div className="dark min-h-screen bg-neuro-black text-foreground overflow-x-hidden">
              {/* Ambient background orbs */}
              <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                <div className="orb-1 absolute top-[-15%] left-[-8%] w-[55%] h-[55%] rounded-full bg-neuro-blue/[0.055] blur-[100px]" />
                <div className="orb-2 absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-neuro-purple/[0.045] blur-[100px]" />
                <div className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[30%] h-[30%] rounded-full bg-neuro-blue/[0.02] blur-[80px]" />
              </div>

              <Navbar />
              <main className="relative z-10">
                <AnimatePresence mode="wait">
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/analysis/:sessionId" element={<Analysis />} />
                    <Route path="/history" element={<History />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                  </Routes>
                </AnimatePresence>
              </main>
              <Footer />
            </div>
          </AuthProvider>
        </BrowserRouter>
      </HeroUIProvider>
    </QueryClientProvider>
  );
}

export default App;
