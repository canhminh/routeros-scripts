const fs = require('fs');

async function fetchAndGenerate(listName, url, scoreLimit) {
  const today = new Date().toISOString().split('T')[0];
  try {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP error! status: ${resp.status}`);
    const text = await resp.text();
    
    // Parse out clean IPs/CIDRs
    const ipList = text.split('\n')
      .filter(l => l.trim() && !l.startsWith('#'))
      .map(l => {
        if (scoreLimit === null) return l.trim(); // For Vietnam list (CIDRs)
        const [ip, score] = l.split(/\s+/);
        return parseInt(score) >= scoreLimit ? ip : null; // For Ipsum List
      }).filter(Boolean);

    let script = `# MikroTik Full Script for ${listName} - Generated ${today}\n`;
    
    // 1. The Nuclear Command: Wipes the list instantly in bulk (Very Fast)
    script += `/ip firewall address-list remove [find list="${listName}"]\n`;
    
    // 2. Switch to the address-list context to execute raw sequential additions
    script += `/ip firewall address-list\n`;
    
    ipList.forEach(ip => {
      script += `add list="${listName}" address=${ip} comment="Sync-${today}"\n`;
    });

    return script;
  } catch (err) {
    console.error(`Failed to generate ${listName}:`, err.message);
    process.exit(1);
  }
}

async function run() {
  const VN_URL = "https://raw.githubusercontent.com/ebrasha/cidr-ip-ranges-by-country/refs/heads/master/CIDR/VN-ipv4-Hackers.Zone.txt";
  const IPSUM_URL = "https://raw.githubusercontent.com/stamparm/ipsum/master/ipsum.txt";

  // Generate both scripts
  const vnScript = await fetchAndGenerate("VN_IPs", VN_URL, null);
  const ipsumScript = await fetchAndGenerate("Ipsum_L2", IPSUM_URL, 2);

  // Save the files locally
  fs.writeFileSync('vn_ips.rsc', vnScript);
  fs.writeFileSync('blacklist.rsc', ipsumScript);
  
  console.log("Successfully generated full-reset scripts for both lists.");
}

run();
