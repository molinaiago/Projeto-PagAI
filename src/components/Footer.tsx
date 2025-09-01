export default function Footer() {
  return (
    <footer className="mt-10 border-t border-emerald-100 bg-emerald-50/80 backdrop-blur">
      <div className="container-page py-6 flex flex-col md:flex-row items-center justify-between text-sm">
        <p className="text-slate-600">
          © {new Date().getFullYear()}{" "}
          <span className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-lime-500">
            PagAÍ
          </span>{" "}
          — Todos os direitos reservados.
        </p>

        <span className="mt-2 md:mt-0 inline-flex items-center rounded-full bg-emerald-100/70 text-emerald-700 px-3 py-1 text-xs font-medium border border-emerald-200 shadow-sm">
          Versão beta
        </span>
      </div>
    </footer>
  );
}
