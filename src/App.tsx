import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Services from './components/Services';
import Locations from './components/Locations';
import Footer from './components/Footer';

function App() {
  return (
    <div className="font-sans antialiased text-text bg-background selection:bg-primary/30">
      <Navbar />
      <main>
        <Hero />
        <Services />
        <Locations />
      </main>
      <Footer />
    </div>
  );
}

export default App;
