---
title: "Финальный security checklist: проверяем сеть перед тем, как считать ее готовой"
date: 2026-04-03
summary: "Финальный security checklist для MikroTik-сети: baseline, VLAN, firewall, Wi-Fi, IPv6, VPN, DNS, monitoring, backups и DR."
tags: ["mikrotik","routeros","security","checklist"]
topics: ["networking"]
toc: true
---

# Финальный security checklist: проверяем сеть перед тем, как считать ее готовой

Сеть нельзя считать готовой только потому, что интернет работает. Готовая сеть сегментирована, управляется, наблюдается, документирована и восстанавливается.

Финальный checklist помогает пройти по всем слоям: RouterOS baseline, VLAN, firewall, Wi-Fi, IPv6, VPN, DNS, monitoring, backups и DR.

## Где это находится в общей архитектуре

Это последняя статья серии. Она не добавляет новый механизм, а проверяет, что все предыдущие решения не противоречат друг другу и действительно работают.

Checklist полезен после первичной настройки, перед переносом в production, после крупных изменений и перед отпуском администратора.

## Перед применением

Перед финальной ревизией ничего опасного применять не нужно. Но перед исправлениями, найденными по checklist:

```routeros
/system backup save name=before-final-security-fixes
/export file=before-final-security-fixes
/system console safe-mode
```

Не исправляйте firewall/VLAN удаленно без rollback-плана.

## Baseline

- RouterOS обновлен до выбранной стабильной версии.
- RouterBOARD firmware проверен.
- Дефолтный `admin` отключен или защищен.
- Пароли сильные и уникальные.
- Ненужные services отключены.
- WinBox/SSH/WebFig/API не доступны с WAN.
- Timezone и NTP настроены.
- Identity устройства понятна.
- Есть свежий backup и export.

Проверки:

```routeros
/system package print
/system routerboard print
/user print
/ip service print
/system clock print
```

## VLAN и addressing

- У каждой VLAN есть назначение.
- Подсети не конфликтуют с VPN/site-to-site.
- Management VLAN определена.
- Trunk/access ports документированы.
- PVID проверены.
- Bridge VLAN table соответствует port map.
- Guest/IoT не находятся в LAN broadcast domain.

Проверки:

```routeros
/interface bridge port print
/interface bridge vlan print
/interface vlan print
/ip address print
```

## DHCP и DNS

- DHCP server работает только на нужных VLAN.
- Pools имеют запас.
- Gateway/DNS options корректны.
- DNS resolver не открыт с WAN.
- DNS policy различает LAN/Guest/IoT/VPN.
- Direct DNS наружу заблокирован, если это требуется policy.
- DoH limitations задокументированы.

Проверки:

```routeros
/ip dhcp-server print
/ip dhcp-server network print
/ip dhcp-server lease print
/ip dns print
```

## Firewall IPv4

- `input` защищает сам роутер.
- `forward` управляет inter-VLAN и internet traffic.
- Established/related rules стоят в начале.
- Invalid drop есть.
- WAN to router drop есть.
- Management разрешен только trusted/VPN.
- Guest имеет только internet + нужные DHCP/DNS.
- IoT не инициирует доступ в LAN/MGMT.
- Нет broad allow between VLAN без причины.
- Drop rules имеют понятные prefixes, если логируются.

Проверки:

```routeros
/ip firewall filter print stats
/ip firewall nat print stats
/log print
```

## NAT и публикация сервисов

- Masquerade ограничен WAN.
- Port forwards документированы.
- Для каждого dstnat есть соответствующий forward allow.
- Management-сервисы не опубликованы.
- Hairpin NAT или split DNS проверены.
- Inbound services имеют обновления, auth, TLS и monitoring.

## Wi-Fi и CAPsMAN

- Main/Guest/IoT SSID ведут в правильные VLAN.
- Guest client isolation включен, если нужно.
- IoT SSID совместим с устройствами, но изолирован firewall.
- AP management находится в Management VLAN.
- Trunk до AP несет нужные tagged VLAN.
- RouterOS 7 WiFi/wireless package не смешаны в конфиге без понимания.

## IPv6

- IPv6 включен только осознанно.
- Prefix delegation работает.
- Каждая VLAN получает ожидаемый prefix.
- IPv6 firewall настроен отдельно.
- ICMPv6 не заблокирован blindly.
- Guest/IoT policy соблюдается в IPv6.
- Management не открыт с WAN по IPv6.

Проверки:

```routeros
/ipv6 address print
/ipv6 route print
/ipv6 firewall filter print stats
```

## WireGuard

- У каждого устройства отдельный peer.
- Allowed-address настроен осознанно.
- VPN subnet не конфликтует с LAN/remote networks.
- WireGuard UDP port разрешен в input только как нужно.
- VPN peers имеют ограниченный доступ к VLAN.
- Потерянный peer можно быстро отозвать.
- Road-warrior и site-to-site не смешаны.

## FastTrack и QoS

- FastTrack не ломает QoS, queues, mangle и policy routing.
- Traffic shaping проверен под нагрузкой.
- WAN bottleneck шейпится ниже реальной скорости.
- CPU не перегружается.
- Исключения FastTrack документированы.

## Dual WAN

- Оба WAN входят в firewall policy как WAN.
- Backup WAN не открывает management.
- NAT работает на обоих WAN.
- Failover и failback протестированы.
- DNS работает при failover.
- WireGuard/inbound services имеют план для смены WAN.
- Alerts приходят при переходе на backup.

## Logging, monitoring, backups, DR

- Важные события логируются с понятными prefixes.
- Remote syslog или внешний сбор логов настроен, если нужен.
- Monitoring покрывает WAN, VPN, CPU/RAM, DHCP pools, DNS, backups.
- Alerts actionable и не шумят.
- Automated backups создают binary backup и export.
- Backup хранится вне роутера.
- Restore testing выполнялся.
- DR runbook доступен вне сети.

## Финальная проверка с клиента

Проверьте реальным устройством:

- LAN получает правильный IP и интернет.
- Guest получает guest IP и не видит LAN/MGMT.
- IoT получает IoT IP и не инициирует доступ в LAN/MGMT.
- VPN-клиент видит только разрешенные сети.
- WAN scan не видит management ports.
- IPv6 policy соответствует IPv4 intent.
- DNS filtering работает согласно VLAN policy.

## Частые ошибки

Проверять только с LAN-ноутбука администратора.

Не тестировать Guest/IoT/VPN как реальные клиенты.

Забыть IPv6.

Не проверять failover и restore.

Оставить временные allow rules после настройки.

## Security notes

Checklist не заменяет регулярную ревизию. Сеть меняется: появляются новые устройства, новые провайдеры, новые сервисы и новые исключения.

Любое исключение должно иметь владельца, причину и дату пересмотра.

## Мини-вывод

Готовая MikroTik-сеть - это не набор команд, а проверяемая система: сегментация, firewall, management boundary, DNS policy, VPN, Wi-Fi, IPv6, monitoring, backups и DR.

На этом серия “Микротик с нуля” заканчивает базовый production-ready контур. Дальше можно углубляться в конкретные сценарии: site-to-site, advanced routing, BGP, централизованный monitoring, zero-trust access и automation.
