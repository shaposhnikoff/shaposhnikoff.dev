---
title: "IoT isolation: отдельный сегмент для умных устройств без поломки smart-home"
date: 2026-03-20
summary: "Изоляция IoT в отдельном VLAN с DHCP/DNS, firewall policy, address-lists и контролируемым доступом из trusted-сегментов."
tags: ["mikrotik","routeros","iot","vlan","security"]
topics: ["networking"]
toc: true
---

# IoT isolation: отдельный сегмент для умных устройств без поломки smart-home

IoT-устройства удобны, но доверять им как рабочему ноутбуку нельзя. Камеры, лампы, розетки, телевизоры и бытовая техника часто редко обновляются, активно ходят в cloud и могут иметь слабую security-модель.

Цель IoT isolation - отделить такие устройства от LAN и Management, но не сломать нужные сценарии smart-home.

## Где это находится в общей архитектуре

Guest VLAN уже дала модель "internet only". IoT похож на Guest тем, что не должен инициировать доступ в LAN/Management, но отличается тем, что LAN иногда должна обращаться к IoT: Home Assistant, принтеры, media devices, локальные API.

Поэтому IoT policy обычно не такая простая, как Guest.

## Базовая политика

| Поток | Решение |
| --- | --- |
| IoT -> Internet | allow или ограниченно |
| IoT -> DNS/DHCP | allow к разрешенным сервисам |
| IoT -> LAN | deny по умолчанию |
| IoT -> Management | deny |
| LAN -> IoT | allow только нужные сервисы |
| Home Assistant -> IoT | allow по списку |
| IoT -> Server | deny, кроме явных исключений |

Главный принцип: IoT не инициирует доступ к доверенным сегментам.

## Перед применением

Перед изменением VLAN/firewall/Wi-Fi:

```routeros
/system backup save name=before-iot-isolation
/export file=before-iot-isolation
/system console safe-mode
```

Сначала инвентаризируйте устройства: IP/MAC, назначение, cloud/local mode, нужные порты, нужен ли multicast/mDNS.

## IoT VLAN и DHCP

Пример:

```routeros
/interface vlan
add name=vlan40-iot interface=br-core vlan-id=40

/ip address
add address=10.10.40.1/24 interface=vlan40-iot comment="IoT gateway"

/ip pool
add name=pool-iot ranges=10.10.40.100-10.10.40.199

/ip dhcp-server
add name=dhcp-iot interface=vlan40-iot address-pool=pool-iot lease-time=1d disabled=no

/ip dhcp-server network
add address=10.10.40.0/24 gateway=10.10.40.1 dns-server=10.10.40.1
```

Для важных IoT-устройств полезны static leases: правила firewall проще писать на address-list или стабильные IP.

## Wi-Fi для IoT

IoT SSID должен вести в IoT VLAN:

```text
SSID: Home-IoT
VLAN ID: 40
Security: WPA2/WPA3 по совместимости устройств
Client isolation: включить, если устройства не должны общаться друг с другом
```

Некоторые старые устройства плохо работают с WPA3, band steering или modern roaming features. Это не повод помещать их в LAN; лучше сделать отдельный IoT SSID с совместимыми параметрами и жесткой firewall policy.

## Firewall

Input:

```routeros
/ip firewall filter
add chain=input action=accept in-interface-list=IOT protocol=udp dst-port=53 comment="iot: allow DNS UDP"
add chain=input action=accept in-interface-list=IOT protocol=tcp dst-port=53 comment="iot: allow DNS TCP"
add chain=input action=accept in-interface-list=IOT protocol=udp dst-port=67 comment="iot: allow DHCP"
add chain=input action=drop in-interface-list=IOT comment="iot: block router management"
```

Forward:

```routeros
/ip firewall filter
add chain=forward action=accept in-interface-list=IOT out-interface-list=WAN comment="iot: allow internet"
add chain=forward action=accept src-address=<home-assistant-ip> dst-address-list=iot-devices comment="lan: allow HA to IoT"
add chain=forward action=drop in-interface-list=IOT out-interface-list=!WAN log=yes log-prefix="drop-iot" comment="iot: block internal"
```

Правило Home Assistant - пример. Лучше явно перечислить устройства и сервисы, чем разрешать весь LAN -> IoT без необходимости.

## Address-lists

Address-lists помогают поддерживать правила:

```routeros
/ip firewall address-list
add list=iot-devices address=<iot-device-ip> comment="living room TV"
add list=iot-controllers address=<home-assistant-ip> comment="Home Assistant"
```

После этого firewall можно читать как policy, а не как набор случайных IP.

## mDNS и discovery

Многие smart-home сценарии зависят от mDNS/SSDP/broadcast discovery. Между VLAN это не работает автоматически. Не пытайтесь решить это широким allow между LAN и IoT.

Для discovery будет отдельная статья про mDNS и service discovery. Здесь важно зафиксировать: маршрутизируемый доступ и multicast discovery - разные задачи.

## Как проверить результат

Проверки:

- IoT device получает IP из IoT subnet;
- интернет работает, если разрешен;
- IoT не открывает LAN/MGMT адреса;
- LAN или Home Assistant видит только разрешенные IoT-сервисы;
- DNS/DHCP работают;
- логи показывают blocked IoT -> internal attempts.

Команды:

```routeros
/ip dhcp-server lease print where server=dhcp-iot
/ip firewall address-list print
/ip firewall filter print stats
/log print
```

## Частые ошибки

Сделать IoT VLAN, но разрешить IoT -> LAN полностью.

Положить Home Assistant в IoT и потерять контроль над trust boundary.

Считать, что mDNS заработает между VLAN сам.

Разрешить IoT к management, потому что "так проще настроить".

## Security notes

IoT-сегмент должен быть недоверенным. Если устройство требует полный доступ к LAN для базовой работы, это повод пересмотреть устройство или сценарий.

Отдельная VLAN не защищает, если firewall разрешает все. Отдельный firewall rule не помогает, если все устройства остаются в одной LAN.

## Мини-вывод

IoT isolation - это компромисс между безопасностью и функциональностью. IoT не должен инициировать доступ к LAN/Management, а trusted-сегменты получают только нужные исключения.

Следующая статья будет про mDNS и service discovery между VLAN.
