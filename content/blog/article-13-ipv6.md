---
title: "IPv6 на MikroTik: prefix delegation, RA/SLAAC и отдельный firewall"
date: 2026-03-23
summary: "Осознанное включение IPv6 на MikroTik: prefix delegation, RA/SLAAC, DNS и отдельный firewall для VLAN."
tags: ["mikrotik","routeros","ipv6","firewall"]
topics: ["networking"]
toc: true
---

# IPv6 на MikroTik: prefix delegation, RA/SLAAC и отдельный firewall

IPv6 нельзя описывать как "IPv4, только адреса длиннее". В IPv6 другая модель адресации, discovery, autoconfiguration и безопасности. Привычный NAT из IPv4 не является основной границей защиты.

Если включить IPv6 без firewall, внутренние устройства могут получить глобальные адреса и стать доступнее, чем вы ожидаете.

## Где это находится в общей архитектуре

До этого сеть работала на IPv4: VLAN, DHCP, DNS, firewall и NAT. IPv6 добавляет отдельный стек, который должен повторять security intent, но не копировать IPv4 правила механически.

Нужны prefix delegation от провайдера, IPv6 addresses на VLAN, RA/SLAAC или DHCPv6, DNS и отдельный IPv6 firewall.

## Основные понятия

Prefix Delegation - провайдер выдает роутеру IPv6 prefix, например `/56` или `/60`, из которого можно раздать `/64` на VLAN.

RA/SLAAC - Router Advertisement позволяет клиентам самостоятельно настроить IPv6 address и gateway.

DHCPv6 может использоваться для дополнительных параметров, но не всегда заменяет SLAAC.

ICMPv6 критически важен для нормальной работы IPv6. Блокировать его blindly нельзя.

## Перед применением

Перед включением IPv6:

```routeros
/system backup save name=before-ipv6
/export file=before-ipv6
/system console safe-mode
```

Проверьте, что пакет IPv6 доступен/включен для вашей RouterOS, и уточните у провайдера PD behavior. Не включайте IPv6 на production-сети без firewall.

## Получение prefix

Схема зависит от WAN: DHCPv6-PD, PPPoE, static prefix. Примерная логика:

```routeros
/ipv6 dhcp-client
add interface=<wan-interface> request=prefix pool-name=isp-ipv6-pool add-default-route=yes
```

Параметры могут отличаться в зависимости от провайдера. Проверяйте на конкретной линии.

## Раздача prefix по VLAN

Обычно каждой VLAN нужен `/64`:

```routeros
/ipv6 address
add from-pool=isp-ipv6-pool interface=vlan20-lan advertise=yes
add from-pool=isp-ipv6-pool interface=vlan30-guest advertise=yes
add from-pool=isp-ipv6-pool interface=vlan40-iot advertise=yes
```

Management VLAN можно включать осторожнее: не всем management devices нужен глобальный IPv6.

## IPv6 firewall

Отдельная цепочка firewall для IPv6 обязательна. Базовая логика:

```routeros
/ipv6 firewall filter
add chain=input action=accept connection-state=established,related,untracked comment="ipv6 input: established related"
add chain=input action=drop connection-state=invalid comment="ipv6 input: drop invalid"
add chain=input action=accept protocol=icmpv6 comment="ipv6 input: allow ICMPv6"
add chain=input action=accept in-interface-list=MGMT comment="ipv6 input: allow management"
add chain=input action=drop in-interface-list=WAN comment="ipv6 input: drop WAN to router"
add chain=input action=drop comment="ipv6 input: drop rest"

add chain=forward action=accept connection-state=established,related,untracked comment="ipv6 forward: established related"
add chain=forward action=drop connection-state=invalid comment="ipv6 forward: drop invalid"
add chain=forward action=accept protocol=icmpv6 comment="ipv6 forward: allow ICMPv6"
add chain=forward action=accept in-interface-list=LAN out-interface-list=WAN comment="ipv6 forward: LAN to Internet"
add chain=forward action=accept in-interface-list=GUEST out-interface-list=WAN comment="ipv6 forward: Guest to Internet"
add chain=forward action=drop in-interface-list=GUEST out-interface-list=!WAN comment="ipv6 forward: block Guest internal"
add chain=forward action=drop comment="ipv6 forward: drop rest"
```

Это стартовая структура, не универсальный полный ruleset. ICMPv6 лучше детализировать осознанно, а не запрещать целиком.

## DNS и RA

Клиенты должны получить DNS. Это может быть через RA options или DHCPv6, в зависимости от поддержки клиентов и RouterOS behavior.

Проверяйте на реальных клиентах: Windows, macOS, Linux, iOS, Android могут вести себя по-разному.

## Как проверить результат

На MikroTik:

```routeros
/ipv6 dhcp-client print
/ipv6 address print
/ipv6 route print
/ipv6 firewall filter print stats
/ping 2606:4700:4700::1111
```

На клиенте:

- есть IPv6 address из правильного prefix;
- есть default gateway через RA;
- работает IPv6 DNS/доступ;
- Guest не видит internal IPv6 addresses;
- WAN не открывает router management.

## Частые ошибки

Включить IPv6 и забыть firewall.

Скопировать IPv4 firewall и сломать ICMPv6.

Ожидать NAT66 как основной security-механизм.

Раздать один prefix без понимания VLAN boundaries.

Не проверить, что DNS работает по IPv6.

## Security notes

IPv6 делает устройства глобально адресуемыми. Это нормально, если firewall настроен. Это опасно, если вы рассчитывали на NAT как на защиту.

IPv6 policy должна соответствовать IPv4 intent: Guest остается guest, IoT остается недоверенным, management не открыт с WAN.

## Мини-вывод

IPv6 - отдельный стек с prefix delegation, RA/SLAAC, DHCPv6-нюансами и обязательным firewall. Его нужно включать осознанно, а не как checkbox.

Следующая статья будет про WireGuard на MikroTik: road-warrior, site-to-site и ограниченный доступ к VLAN.
