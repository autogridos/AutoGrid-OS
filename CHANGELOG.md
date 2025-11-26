# Changelog

All notable changes to AutoGrid OS will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Service Robot Adapter for hospitality, delivery, and customer service bots
- Full ReputationRegistry implementation with decay and weighted ratings
- GitHub Actions CI/CD pipeline
- CONTRIBUTING.md guidelines

### Fixed
- Fixed typo in CoordinationLayer filename (was CordinationLayer)
- Core AutoGridOS class now properly implemented

## [1.0.0] - 2024-11-26

### Added
- Initial release of AutoGrid OS
- Core `AutoGridOS` class for device management
- `PaymentModule` with payment channels support
- `TaskMarketplace` for task discovery and bidding
- `TaskVerificationModule` with ZK-proof support
- `CoordinationLayer` for task coordination and routing
- `FleetManager` for managing device fleets
- `WarehouseRobotAdapter` for warehouse automation
- Comprehensive TypeScript type definitions
- Event-driven architecture with EventEmitter
- Basic documentation and examples

### Security
- Payment proof generation and verification
- ZK-proof support for privacy-preserving verification

## Types of Changes

- **Added** for new features
- **Changed** for changes in existing functionality
- **Deprecated** for soon-to-be removed features
- **Removed** for now removed features
- **Fixed** for any bug fixes
- **Security** for vulnerability fixes

[Unreleased]: https://github.com/autogrid/autogrid-os/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/autogrid/autogrid-os/releases/tag/v1.0.0
