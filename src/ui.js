export const BANNER = String.raw`
██████╗ ██████╗  ██████╗ ██╗    ██╗██████╗     ███╗   ███╗██╗███╗   ██╗███████╗
██╔══██╗██╔══██╗██╔═══██╗██║    ██║╚════██╗    ████╗ ████║██║████╗  ██║██╔════╝
██████╔╝██████╔╝██║   ██║██║ █╗ ██║ █████╔╝    ██╔████╔██║██║██╔██╗ ██║█████╗  
██╔══██╗██╔═══╝ ██║   ██║██║███╗██║██╔═══╝     ██║╚██╔╝██║██║██║╚██╗██║██╔══╝  
██║  ██║██║     ╚██████╔╝╚███╔███╔╝███████╗    ██║ ╚═╝ ██║██║██║ ╚████║███████╗
╚═╝  ╚═╝╚═╝      ╚═════╝  ╚══╝╚══╝ ╚══════╝    ╚═╝     ╚═╝╚═╝╚═╝  ╚═══╝╚══════╝
                              RPOW2 MINE
`;

export function renderMenu() {
  return `${BANNER}
[1] Login with email magic link
[2] Start automine
[3] Check balance
[4] View public ledger
[5] Show saved session
[0] Exit
`;
}

export function logSection(title) {
  const line = '='.repeat(Math.max(12, title.length + 8));
  console.log(`\n${line}\n== ${title} ==\n${line}`);
}

export function fmtNum(n) {
  return Number(n ?? 0).toLocaleString('en-US');
}
