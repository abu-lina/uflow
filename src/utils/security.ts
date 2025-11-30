/**
 * Security Utilities
 * 
 * Provides security functions for bot/hacker prevention:
 * - Disposable email detection
 * - IP blocking management
 * - Request timing analysis
 */

// Blocked disposable email domains
// Comprehensive list of known temporary/disposable email services
// Updated: 2024 - Expanded to 600+ domains for better bot protection
const DISPOSABLE_EMAIL_DOMAINS = [
  // Original list
  'tempmail.com',
  '10minutemail.com',
  'guerrillamail.com',
  'mailinator.com',
  'throwaway.email',
  'temp-mail.org',
  'getnada.com',
  'mohmal.com',
  'fakeinbox.com',
  'trashmail.com',
  'maildrop.cc',
  'yopmail.com',
  'sharklasers.com',
  'guerrillamailblock.com',
  'pokemail.net',
  'spam4.me',
  'bccto.me',
  'chammy.info',
  'devnullmail.com',
  'mailcatch.com',
  'meltmail.com',
  'mintemail.com',
  'mytrashmail.com',
  'tempail.com',
  'tempinbox.co.uk',
  'tempmail.net',
  'tempmailo.com',
  'tmail.ws',
  'tmpmail.org',
  'zoemail.org',
  
  // Additional common disposable email services
  'dunefee.com',
  '0-mail.com',
  '0815.ru',
  '0wnd.net',
  '0wnd.org',
  '10mail.org',
  '10minutemail.de',
  '10minutemail.co.uk',
  '123-m.com',
  '1pad.de',
  '20minutemail.com',
  '21cn.com',
  '2prong.com',
  '33mail.com',
  '3d-painting.com',
  '4warding.com',
  '4warding.net',
  '4warding.org',
  '5ymail.com',
  '6paq.com',
  '7tags.com',
  '9ox.net',
  'a-bc.net',
  'agedmail.com',
  'ajaxapp.net',
  'ama-trade.de',
  'amilegit.com',
  'amiri.net',
  'amiriindustries.com',
  'anonmails.de',
  'antispam.de',
  'armyspy.com',
  'asdasd.nl',
  'autosfromus.com',
  'baxomale.ht.cx',
  'beefmilk.com',
  'binkmail.com',
  'bio-muesli.net',
  'bobmail.info',
  'bodhi.lawlita.com',
  'bofthew.com',
  'brefmail.com',
  'bsnow.net',
  'bspamfree.org',
  'bugmenot.com',
  'bumpymail.com',
  'casualdx.com',
  'centermail.com',
  'centermail.net',
  'chammy.info',
  'childsavetrust.org',
  'chogmail.com',
  'choicemail1.com',
  'cool.fr.nf',
  'correotemporal.org',
  'cosmorph.com',
  'courriel.fr.nf',
  'courrieltemporaire.com',
  'crapmail.org',
  'crazymailing.com',
  'curryworld.de',
  'cust.in',
  'dacoolest.com',
  'dandikmail.com',
  'dayrep.com',
  'deadaddress.com',
  'deadspam.com',
  'delikkt.de',
  'despam.it',
  'devnullmail.com',
  'dfgh.net',
  'digitalsanctuary.com',
  'dingbone.com',
  'discard.email',
  'discardmail.com',
  'discardmail.de',
  'dispostable.com',
  'dodgeit.com',
  'dodgit.com',
  'dodgit.org',
  'doiea.com',
  'donemail.ru',
  'dontreg.com',
  'dontsendmespam.de',
  'drdrb.com',
  'dump-email.info',
  'dumpandjunk.com',
  'dumpyemail.com',
  'e4ward.com',
  'email60.com',
  'emailias.com',
  'emailinfive.com',
  'emailmiser.com',
  'emailtemporar.ro',
  'emailtemporario.com.br',
  'emailwarden.com',
  'emeil.ir',
  'emeil.li',
  'emkei.cf',
  'ephemail.net',
  'etranquil.com',
  'evopo.com',
  'explodemail.com',
  'fake-box.com',
  'fakemail.fr',
  'fakemailgenerator.com',
  'fansworldwide.de',
  'fastacura.com',
  'fastchevy.com',
  'fastkawasaki.com',
  'fastmazda.com',
  'fastmitsubishi.com',
  'fastnissan.com',
  'fastsubaru.com',
  'fastsuzuki.com',
  'fasttoyota.com',
  'fastyamaha.com',
  'filzmail.com',
  'fizmail.com',
  'fleckens.hu',
  'frapmail.com',
  'friendlymail.co.uk',
  'front14.org',
  'fuckingduh.com',
  'fudgerub.com',
  'fux0ringduh.com',
  'garliclife.com',
  'gehensiemirnichtaufdensack.de',
  'gelitik.in',
  'get-mail.cf',
  'get1mail.com',
  'get2mail.fr',
  'getairmail.cf',
  'getmails.eu',
  'getonemail.com',
  'ghosttexter.de',
  'giantmail.de',
  'girlsundertheinfluence.com',
  'gishpuppy.com',
  'goemailgo.com',
  'gotmail.com',
  'gotmail.net',
  'gotmail.org',
  'gotti.otherinbox.com',
  'great-host.in',
  'greensloth.com',
  'grr.la',
  'gsrv.co.uk',
  'guerillamail.biz',
  'guerillamail.com',
  'guerillamail.de',
  'guerillamail.info',
  'guerillamail.net',
  'guerillamail.org',
  'guerrillamail.com',
  'guerrillamailblock.com',
  'gustr.com',
  'h8s.org',
  'haltospam.com',
  'hatespam.org',
  'hidemail.de',
  'hidzz.com',
  'hmamail.com',
  'hochsitze.com',
  'hotpop.com',
  'hulapla.de',
  'ieatspam.eu',
  'ieatspam.info',
  'ihateyoualot.info',
  'iheartspam.org',
  'imails.info',
  'inboxclean.com',
  'inboxclean.org',
  'incognitomail.org',
  'instant-mail.de',
  'ipoo.org',
  'irish2me.com',
  'iwi.net',
  'jetable.com',
  'jetable.fr.nf',
  'jetable.net',
  'jetable.org',
  'jnxjn.com',
  'jourrapide.com',
  'jsrsolutions.com',
  'kasmail.com',
  'kaspop.com',
  'keepmymail.com',
  'killmail.com',
  'killmail.net',
  'kir.ch.tc',
  'klassmaster.com',
  'klassmaster.net',
  'klzlk.com',
  'kook.ml',
  'koszmail.pl',
  'kurzepost.de',
  'l33r.eu',
  'lags.us',
  'landmail.co',
  'lastmail.co',
  'lastmail.com',
  'lazyinbox.com',
  'lifebyfood.com',
  'link2mail.net',
  'litedrop.com',
  'liveradio.tk',
  'lolfreak.net',
  'lookugly.com',
  'lopl.co.cc',
  'lortemail.dk',
  'lovemeleaveme.com',
  'lpfmgmtltd.com',
  'lr78.com',
  'lroid.com',
  'lukop.dk',
  'm21.cc',
  'm4ilweb.info',
  'maboard.com',
  'mail-filter.com',
  'mail-temporaire.fr',
  'mail.by',
  'mail.mezimages.net',
  'mail114.net',
  'mail15.com',
  'mail1a.de',
  'mail2000.ru',
  'mail2rss.org',
  'mail333.com',
  'mail4trash.com',
  'mailbidon.com',
  'mailbiz.biz',
  'mailblocks.com',
  'mailbucket.org',
  'mailcat.biz',
  'mailcatch.com',
  'mailde.de',
  'mailde.info',
  'maildrop.cc',
  'maileater.com',
  'mailexpire.com',
  'mailfreeonline.com',
  'mailfs.com',
  'mailguard.me',
  'mailimate.com',
  'mailin8r.com',
  'mailinater.com',
  'mailinator.com',
  'mailinator.net',
  'mailinator.org',
  'mailinbox.lv',
  'mailismagic.com',
  'mailme.lv',
  'mailme24.com',
  'mailmetrash.com',
  'mailmoat.com',
  'mailms.com',
  'mailnull.com',
  'mailorg.org',
  'mailpick.biz',
  'mailproxsy.com',
  'mailquack.com',
  'mailrock.biz',
  'mailsac.com',
  'mailscrap.com',
  'mailseal.de',
  'mailshell.com',
  'mailsiphon.com',
  'mailslapping.com',
  'mailsnag.net',
  'mailtemp.info',
  'mailtome.com',
  'mailtothis.com',
  'mailtv.net',
  'mailtv.tv',
  'mailzi.ru',
  'makemetheking.com',
  'manifestgenerator.com',
  'manybrain.com',
  'mbx.cc',
  'mega.zik.dj',
  'meinspamschutz.de',
  'meltmail.com',
  'messagebeamer.de',
  'mezimages.net',
  'mierdamail.com',
  'migmail.net',
  'migumail.com',
  'mintemail.com',
  'mjukglass.nu',
  'moakt.com',
  'moburl.com',
  'mohmal.com',
  'monemail.fr.nf',
  'monumentmail.com',
  'moot.es',
  'mox.pp.ua',
  'mrresourcepacks.tk',
  'msa.minsmail.com',
  'mt2009.com',
  'mt2014.com',
  'muelre.com',
  'mvrht.com',
  'my10minutemail.com',
  'mymail-in.net',
  'mypacks.net',
  'mysamp.de',
  'myspaceinc.com',
  'myspaceinc.net',
  'myspaceinc.org',
  'myspacepimpedup.com',
  'myspamless.com',
  'mytemp.email',
  'mytempemail.com',
  'mytrashmail.com',
  'neomailbox.com',
  'nepwk.com',
  'nervmich.net',
  'nervtmich.net',
  'netmails.net',
  'netzidiot.de',
  'neverbox.com',
  'nice-4u.com',
  'nincsmail.hu',
  'nmail.cf',
  'no-spam.ws',
  'nobulk.com',
  'noclickemail.com',
  'nodezine.com',
  'nospam.ze.tc',
  'nospam4.us',
  'nospamfor.us',
  'nospammail.net',
  'notmailinator.com',
  'nowhere.org',
  'nowmymail.com',
  'nurfuerspam.de',
  'nus.edu.sg',
  'nwldx.com',
  'objectmail.com',
  'obobbo.com',
  'odaymail.com',
  'odnorazovoe.ru',
  'one-time.email',
  'onewaymail.com',
  'online.ms',
  'oopi.org',
  'opayq.com',
  'ordinaryamerican.net',
  'otherinbox.com',
  'ourklips.com',
  'outlawspam.com',
  'ovpn.to',
  'owlpic.com',
  'pancakemail.com',
  'paplease.com',
  'pcusers.otherinbox.com',
  'pepbot.com',
  'pfui.ru',
  'pimpedupmyspace.com',
  'pingir.com',
  'pisem.net',
  'pjkh.com',
  'plexolan.de',
  'poczta.onet.pl',
  'politikerclub.de',
  'poofy.org',
  'pookmail.com',
  'pop3.usa.com',
  'postacin.com',
  'privacy.net',
  'privatdemail.net',
  'proxymail.eu',
  'prtnx.com',
  'punkass.com',
  'putthisinyourspamdatabase.com',
  'pwrby.com',
  'quickinbox.com',
  'rcpt.at',
  'recode.me',
  'recursor.net',
  'recyclemail.dk',
  'regbypass.com',
  'rejectmail.com',
  'remail.cf',
  'rhyta.com',
  'rklips.com',
  'rmqkr.net',
  'royal.net',
  'rppkn.com',
  'rtrtr.com',
  's0ny.net',
  'safe-mail.net',
  'safetymail.info',
  'safetypost.de',
  'sagsn.com',
  'sandelf.de',
  'saynotospams.com',
  'scatmail.com',
  'schafmail.de',
  'schmeissweg.tk',
  'schrott-email.de',
  'secretemail.de',
  'secure-mail.biz',
  'selfdestructingmail.com',
  'sendspamhere.com',
  'senseless-entertainment.com',
  'services391.com',
  'sharklasers.com',
  'shieldemail.com',
  'shiftmail.com',
  'shitmail.me',
  'shortmail.net',
  'sibmail.com',
  'sinnlos-mail.de',
  'siria.com',
  'skeefmail.com',
  'slaskpost.se',
  'slopsbox.com',
  'smellfear.com',
  'smellrear.com',
  'snakemail.com',
  'sneakemail.com',
  'snkmail.com',
  'sofimail.com',
  'sofort-mail.de',
  'sogetthis.com',
  'soodonims.com',
  'spam.la',
  'spam.su',
  'spam4.me',
  'spamavert.com',
  'spambob.com',
  'spambob.net',
  'spambob.org',
  'spambog.com',
  'spambog.de',
  'spambog.net',
  'spambog.ru',
  'spambox.info',
  'spambox.irishspringrealty.com',
  'spambox.us',
  'spamcero.com',
  'spamday.com',
  'spamex.com',
  'spamfree24.com',
  'spamfree24.de',
  'spamfree24.org',
  'spamgourmet.com',
  'spamgourmet.net',
  'spamgourmet.org',
  'spamherelots.com',
  'spamhereplease.com',
  'spamhole.com',
  'spamify.com',
  'spaminator.de',
  'spamkill.info',
  'spaml.com',
  'spaml.de',
  'spammotel.com',
  'spamobox.com',
  'spamoff.de',
  'spamthis.co.uk',
  'spamthisplease.com',
  'speed.1s.fr',
  'speedgaus.net',
  'spikio.com',
  'spoofmail.de',
  'spybox.de',
  'squizzy.de',
  'sriaus.com',
  'stinkefinger.net',
  'stop-my-spam.com',
  'stuffmail.de',
  'super-auswahl.de',
  'supergreatmail.com',
  'supermailer.jp',
  'superrito.com',
  'superstachel.de',
  'suremail.info',
  'tagyourself.com',
  'talkinator.com',
  'teewars.org',
  'teleosaurs.xyz',
  'teleworm.com',
  'temp-mail.ru',
  'tempalias.com',
  'tempe-mail.com',
  'tempemail.biz',
  'tempemail.com',
  'tempinbox.co.uk',
  'tempinbox.com',
  'tempmail.eu',
  'tempmail.it',
  'tempmail2.com',
  'tempmailer.com',
  'tempmailer.de',
  'tempomail.fr',
  'temporarily.de',
  'temporarioemail.com.br',
  'tempsky.com',
  'tempthe.net',
  'tempymail.com',
  'thanksnospam.info',
  'thankyou2010.com',
  'thisisnotmyrealemail.com',
  'throwam.com',
  'tilien.com',
  'tmail.ws',
  'tmailinator.com',
  'toiea.com',
  'tradermail.info',
  'trash-amil.com',
  'trash-mail.at',
  'trash-mail.com',
  'trash-mail.de',
  'trash2009.com',
  'trashemail.de',
  'trashmail.at',
  'trashmail.com',
  'trashmail.de',
  'trashmail.me',
  'trashmail.net',
  'trashmail.org',
  'trashmailer.com',
  'trashymail.com',
  'trialmail.de',
  'trillianpro.com',
  'turual.com',
  'twinmail.de',
  'tyldd.com',
  'ubismail.net',
  'uggsrock.com',
  'umail.net',
  'upliftnow.com',
  'uplipht.com',
  'uroid.com',
  'us.af',
  'venompen.com',
  'veryrealemail.com',
  'viditag.com',
  'viewcastmedia.com',
  'viewcastmedia.net',
  'viewcastmedia.org',
  'webemail.me',
  'webm4il.info',
  'wh4f.org',
  'whyspam.me',
  'willselfdestruct.com',
  'winemaven.info',
  'wronghead.com',
  'wuzup.net',
  'wuzupmail.net',
  'xagloo.com',
  'xemaps.com',
  'xents.com',
  'xmaily.com',
  'xoxy.net',
  'yapped.net',
  'yeah.net',
  'yep.it',
  'yogamaven.com',
  'yopmail.com',
  'yopmail.fr',
  'yopmail.net',
  'youmailr.com',
  'ypmail.webnast.de',
  'zippymail.info',
  'zoemail.org',
  'zoemail.net',
  'zomg.info',
  'zoppe.org',
  'zwebmail.com',
  'zxcv.com',
  'zxcvbnm.com',
  'zzz.com',
];

// Suspicious IPs tracking (in production, use Redis/database)
// Format: { ip: { count: number, blockedUntil: number, attempts: number[] } }
const suspiciousIPs = new Map<string, { 
  count: number; 
  blockedUntil: number;
  attempts: number[];
}>();

/**
 * Check if an email is from a disposable email service
 */
export function isDisposableEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return false;
  return DISPOSABLE_EMAIL_DOMAINS.includes(domain);
}

/**
 * Get client IP from request headers
 */
export function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cfConnectingIP = request.headers.get('cf-connecting-ip'); // Cloudflare
  
  // Priority: Cloudflare > X-Forwarded-For > X-Real-IP
  if (cfConnectingIP) {
    return cfConnectingIP.trim();
  }
  
  if (forwarded) {
    // X-Forwarded-For can contain multiple IPs, take the first one
    return forwarded.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP.trim();
  }
  
  return 'unknown';
}

/**
 * Check if an IP is currently blocked
 */
export function checkIPBlocked(ip: string): boolean {
  const entry = suspiciousIPs.get(ip);
  if (!entry) return false;
  
  if (Date.now() < entry.blockedUntil) {
    return true; // Still blocked
  }
  
  // Block expired, remove it
  suspiciousIPs.delete(ip);
  return false;
}

/**
 * Mark an IP as suspicious and optionally block it
 * @param ip - IP address to mark
 * @param hours - Hours to block (default: 24)
 */
export function markSuspiciousIP(ip: string, hours: number = 24): void {
  const now = Date.now();
  const existing = suspiciousIPs.get(ip);
  
  suspiciousIPs.set(ip, {
    count: (existing?.count || 0) + 1,
    blockedUntil: now + (hours * 60 * 60 * 1000),
    attempts: [...(existing?.attempts || []), now].slice(-10), // Keep last 10 attempts
  });
}

/**
 * Unblock an IP address (useful for test mode)
 * @param ip - IP address to unblock
 */
export function unblockIP(ip: string): void {
  suspiciousIPs.delete(ip);
}

/**
 * Validate password complexity
 * Requirements:
 * - At least 8 characters
 * - Contains at least one letter
 * - Contains at least one number
 */
export function validatePasswordComplexity(password: string): { 
  valid: boolean; 
  error?: string 
} {
  if (password.length < 8) {
    return { 
      valid: false, 
      error: 'Password must be at least 8 characters long' 
    };
  }

  // Check for at least one letter
  if (!/[a-zA-Z]/.test(password)) {
    return { 
      valid: false, 
      error: 'Password must contain at least one letter' 
    };
  }

  // Check for at least one number
  if (!/\d/.test(password)) {
    return { 
      valid: false, 
      error: 'Password must contain at least one number' 
    };
  }

  return { valid: true };
}

/**
 * Analyze request timing to detect bots
 * Bots typically submit forms very quickly (< 100ms)
 * @param startTime - Request start timestamp
 * @returns true if request timing is suspicious
 */
export function isSuspiciousTiming(startTime: number): boolean {
  const requestTime = Date.now() - startTime;
  // Less than 100ms is suspicious (human can't fill form that fast)
  return requestTime < 100;
}

/**
 * Clean up expired IP blocks (call periodically)
 */
export function cleanupExpiredBlocks(): void {
  const now = Date.now();
  const ipsToDelete: string[] = [];
  
  // Collect IPs to delete (avoid modifying Map during iteration)
  suspiciousIPs.forEach((entry, ip) => {
    if (now >= entry.blockedUntil) {
      ipsToDelete.push(ip);
    }
  });
  
  // Delete expired entries
  ipsToDelete.forEach(ip => suspiciousIPs.delete(ip));
}

// Clean up expired blocks every hour
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupExpiredBlocks, 60 * 60 * 1000);
}

