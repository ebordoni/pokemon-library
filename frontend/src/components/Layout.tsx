import { NavLink, Outlet } from "react-router-dom";

export default function Layout() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <nav className="bg-pokemon-red shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-8">
          <span className="text-white font-bold text-xl tracking-wide select-none">
            Pokémon Library
          </span>

          <NavLink
            to="/catalog"
            className={({ isActive }) =>
              `text-sm font-medium transition-colors ${
                isActive
                  ? "text-pokemon-yellow underline"
                  : "text-white hover:text-pokemon-yellow"
              }`
            }
          >
            Catalog
          </NavLink>

          <NavLink
            to="/upload"
            className={({ isActive }) =>
              `text-sm font-medium transition-colors ${
                isActive
                  ? "text-pokemon-yellow underline"
                  : "text-white hover:text-pokemon-yellow"
              }`
            }
          >
            Add Cards
          </NavLink>
        </div>
      </nav>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Outlet />
      </main>

      <footer className="text-center text-xs text-gray-400 py-3">
        Pokémon Library — personal collection tracker
      </footer>
    </div>
  );
}
