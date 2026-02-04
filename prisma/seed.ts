import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma";
import bcrypt from "bcryptjs";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set");
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  // Create admin user
  const adminPassword = await bcrypt.hash("Admin123!", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@openbmc-learning.local" },
    update: {},
    create: {
      email: "admin@openbmc-learning.local",
      passwordHash: adminPassword,
      displayName: "Admin User",
      role: "ADMIN",
      emailVerified: new Date(),
    },
  });
  console.log(`Created admin user: ${admin.email}`);

  // Create test learner
  const learnerPassword = await bcrypt.hash("Learner123!", 12);
  const learner = await prisma.user.upsert({
    where: { email: "learner@openbmc-learning.local" },
    update: {},
    create: {
      email: "learner@openbmc-learning.local",
      passwordHash: learnerPassword,
      displayName: "Test Learner",
      role: "LEARNER",
      emailVerified: new Date(),
    },
  });
  console.log(`Created learner user: ${learner.email}`);

  // Create Learning Paths
  const gettingStartedPath = await prisma.learningPath.upsert({
    where: { slug: "getting-started" },
    update: {},
    create: {
      slug: "getting-started",
      title: "Getting Started with OpenBMC",
      description:
        "Learn the fundamentals of OpenBMC, including what it is, its architecture, and how to set up your development environment.",
      difficulty: "BEGINNER",
      estimatedHours: 4,
      published: true,
      order: 1,
    },
  });

  const dbusPath = await prisma.learningPath.upsert({
    where: { slug: "dbus-fundamentals" },
    update: {},
    create: {
      slug: "dbus-fundamentals",
      title: "D-Bus Fundamentals",
      description:
        "Master D-Bus communication in OpenBMC. Learn about interfaces, methods, signals, and properties.",
      difficulty: "INTERMEDIATE",
      estimatedHours: 6,
      published: true,
      order: 2,
    },
  });

  const sensorsPath = await prisma.learningPath.upsert({
    where: { slug: "sensor-management" },
    update: {},
    create: {
      slug: "sensor-management",
      title: "Sensor Management",
      description:
        "Understand how sensors work in OpenBMC. Configure, monitor, and troubleshoot hardware sensors.",
      difficulty: "INTERMEDIATE",
      estimatedHours: 5,
      published: true,
      order: 3,
    },
  });

  const recipesPath = await prisma.learningPath.upsert({
    where: { slug: "writing-recipes" },
    update: {},
    create: {
      slug: "writing-recipes",
      title: "Writing Yocto Recipes",
      description:
        "Learn to create and customize Yocto recipes for OpenBMC. Build custom packages and images.",
      difficulty: "ADVANCED",
      estimatedHours: 8,
      published: true,
      order: 4,
    },
  });

  const interfacesPath = await prisma.learningPath.upsert({
    where: { slug: "interfaces" },
    update: {},
    create: {
      slug: "interfaces",
      title: "Management Interfaces",
      description:
        "Learn about OpenBMC management interfaces including IPMI, Redfish, WebUI, KVM, and more.",
      difficulty: "INTERMEDIATE",
      estimatedHours: 10,
      published: true,
      order: 5,
    },
  });

  const advancedPath = await prisma.learningPath.upsert({
    where: { slug: "advanced-topics" },
    update: {},
    create: {
      slug: "advanced-topics",
      title: "Advanced Topics",
      description:
        "Deep dive into advanced OpenBMC topics including MCTP/PLDM, firmware updates, debugging, and testing.",
      difficulty: "ADVANCED",
      estimatedHours: 15,
      published: true,
      order: 6,
    },
  });

  const portingPath = await prisma.learningPath.upsert({
    where: { slug: "platform-porting" },
    update: {},
    create: {
      slug: "platform-porting",
      title: "Platform Porting",
      description:
        "Learn how to port OpenBMC to new hardware platforms including device tree, U-Boot, and verification.",
      difficulty: "ADVANCED",
      estimatedHours: 12,
      published: true,
      order: 7,
    },
  });

  // Create prerequisites
  await prisma.pathPrerequisite.upsert({
    where: {
      pathId_prerequisiteId: { pathId: dbusPath.id, prerequisiteId: gettingStartedPath.id },
    },
    update: {},
    create: {
      pathId: dbusPath.id,
      prerequisiteId: gettingStartedPath.id,
    },
  });

  await prisma.pathPrerequisite.upsert({
    where: { pathId_prerequisiteId: { pathId: sensorsPath.id, prerequisiteId: dbusPath.id } },
    update: {},
    create: {
      pathId: sensorsPath.id,
      prerequisiteId: dbusPath.id,
    },
  });

  await prisma.pathPrerequisite.upsert({
    where: {
      pathId_prerequisiteId: { pathId: recipesPath.id, prerequisiteId: gettingStartedPath.id },
    },
    update: {},
    create: {
      pathId: recipesPath.id,
      prerequisiteId: gettingStartedPath.id,
    },
  });

  console.log("Created learning paths with prerequisites");

  // GitHub Pages base URL for content source
  const GITHUB_PAGES_BASE = "https://MichaelTien8901.github.io/openbmc-guide-tutorial";

  // Create Lessons for Getting Started path
  const lesson1 = await prisma.lesson.upsert({
    where: { slug: "what-is-openbmc" },
    update: {
      sourceUrl: `${GITHUB_PAGES_BASE}/docs/01-getting-started/01-introduction`,
      repositoryPath: "docs/01-getting-started/01-introduction.md",
      displayMode: "RENDER",
    },
    create: {
      slug: "what-is-openbmc",
      title: "What is OpenBMC?",
      description: "Introduction to OpenBMC and its role in server management",
      sourceUrl: `${GITHUB_PAGES_BASE}/docs/01-getting-started/01-introduction`,
      repositoryPath: "docs/01-getting-started/01-introduction.md",
      displayMode: "RENDER",
      content: `# What is OpenBMC?

OpenBMC is an open-source project that provides a Linux distribution for Board Management Controllers (BMCs). It's designed to enable a more open, secure, and customizable approach to server management.

## Key Features

- **Open Source**: Fully open-source firmware and software stack
- **Linux-based**: Built on the Yocto Project, providing a familiar Linux environment
- **Modular**: Component-based architecture for easy customization
- **Secure**: Modern security practices and regular updates

## Architecture Overview

OpenBMC runs on the BMC chip, which is a dedicated microcontroller on server motherboards. It provides:

1. **Out-of-band management** - Manage servers even when the main CPU is off
2. **Hardware monitoring** - Track temperatures, voltages, and fan speeds
3. **Remote console** - KVM and serial-over-LAN access
4. **Power management** - Control server power states

## Who Uses OpenBMC?

Major technology companies including Facebook, Google, Microsoft, and IBM contribute to and use OpenBMC in their data centers.

## Next Steps

In the following lessons, we'll explore the OpenBMC architecture in detail and set up a development environment.
`,
      difficulty: "BEGINNER",
      estimatedMinutes: 15,
      published: true,
    },
  });

  const lesson2 = await prisma.lesson.upsert({
    where: { slug: "openbmc-architecture" },
    update: {
      sourceUrl: `${GITHUB_PAGES_BASE}/docs/02-architecture/01-openbmc-overview`,
      repositoryPath: "docs/02-architecture/01-openbmc-overview.md",
      displayMode: "RENDER",
    },
    create: {
      slug: "openbmc-architecture",
      title: "OpenBMC Architecture",
      description: "Deep dive into the components that make up OpenBMC",
      sourceUrl: `${GITHUB_PAGES_BASE}/docs/02-architecture/01-openbmc-overview`,
      repositoryPath: "docs/02-architecture/01-openbmc-overview.md",
      displayMode: "RENDER",
      content: `# OpenBMC Architecture

Understanding the OpenBMC architecture is essential for effective development and troubleshooting.

## Core Components

### 1. Yocto/OpenEmbedded Build System

OpenBMC uses Yocto Project to build the firmware image. Key concepts:

- **Recipes**: Instructions for building packages
- **Layers**: Collections of recipes organized by function
- **BitBake**: The build engine that processes recipes

### 2. D-Bus System Bus

D-Bus is the inter-process communication (IPC) mechanism used throughout OpenBMC:

- Services register objects on the bus
- Clients discover and interact with services
- Signals provide event notifications

### 3. Phosphor Services

The phosphor-* packages provide core BMC functionality:

- \`phosphor-state-manager\`: Power and chassis state
- \`phosphor-inventory-manager\`: Hardware inventory
- \`phosphor-logging\`: Error logging
- \`phosphor-dbus-interfaces\`: D-Bus interface definitions

### 4. Redfish API

OpenBMC implements the DMTF Redfish standard for REST-based management:

\`\`\`bash
# Example: Get chassis information
curl -k -X GET https://bmc-ip/redfish/v1/Chassis/chassis
\`\`\`

## Directory Structure

\`\`\`
/usr/share/phosphor-dbus-yaml/  # D-Bus interface definitions
/var/log/                        # System and application logs
/etc/                            # Configuration files
\`\`\`

## Next Steps

Now that you understand the architecture, let's set up your development environment.
`,
      difficulty: "BEGINNER",
      estimatedMinutes: 25,
      published: true,
    },
  });

  const lesson3 = await prisma.lesson.upsert({
    where: { slug: "development-environment-setup" },
    update: {
      sourceUrl: `${GITHUB_PAGES_BASE}/docs/01-getting-started/02-environment-setup`,
      repositoryPath: "docs/01-getting-started/02-environment-setup.md",
      displayMode: "RENDER",
    },
    create: {
      slug: "development-environment-setup",
      title: "Setting Up Your Development Environment",
      description: "Configure your workstation for OpenBMC development",
      sourceUrl: `${GITHUB_PAGES_BASE}/docs/01-getting-started/02-environment-setup`,
      repositoryPath: "docs/01-getting-started/02-environment-setup.md",
      displayMode: "RENDER",
      content: `# Setting Up Your Development Environment

This lesson guides you through setting up a complete OpenBMC development environment.

## Prerequisites

- Linux workstation (Ubuntu 20.04+ recommended)
- At least 100GB free disk space
- 16GB+ RAM recommended
- Good internet connection

## Step 1: Install Dependencies

\`\`\`bash
sudo apt-get update
sudo apt-get install -y git build-essential python3 python3-pip \\
    gawk wget diffstat unzip texinfo gcc-multilib \\
    chrpath socat cpio xz-utils debianutils iputils-ping \\
    libsdl1.2-dev python3-distutils
\`\`\`

## Step 2: Clone OpenBMC

\`\`\`bash
git clone https://github.com/openbmc/openbmc.git
cd openbmc
\`\`\`

## Step 3: Select a Machine Target

\`\`\`bash
# List available machines
ls meta-*/recipes-phosphor/images/

# Set up for QEMU development
. setup romulus
\`\`\`

## Step 4: Build

\`\`\`bash
bitbake obmc-phosphor-image
\`\`\`

> **Note**: The first build can take several hours!

## Step 5: Run in QEMU

\`\`\`bash
runqemu
\`\`\`

## Verification

After boot, you should be able to:

1. Log in via SSH (root, no password by default)
2. Access Redfish at https://localhost:2443/redfish/v1
3. Use busctl to explore D-Bus

## Troubleshooting

Common issues and solutions:

- **Build fails**: Check for missing dependencies
- **QEMU won't start**: Verify virtualization support
- **No network**: Check QEMU network configuration

Congratulations! You now have a working OpenBMC development environment.
`,
      difficulty: "BEGINNER",
      estimatedMinutes: 45,
      hasCodeExercise: true,
      published: true,
    },
  });

  // Additional Getting Started lessons
  const lesson4 = await prisma.lesson.upsert({
    where: { slug: "first-build" },
    update: {
      sourceUrl: `${GITHUB_PAGES_BASE}/docs/01-getting-started/03-first-build`,
      repositoryPath: "docs/01-getting-started/03-first-build.md",
      displayMode: "RENDER",
    },
    create: {
      slug: "first-build",
      title: "Your First OpenBMC Build",
      description: "Build your first OpenBMC image from source",
      sourceUrl: `${GITHUB_PAGES_BASE}/docs/01-getting-started/03-first-build`,
      repositoryPath: "docs/01-getting-started/03-first-build.md",
      displayMode: "RENDER",
      content: "# Your First OpenBMC Build\n\nLearn how to build OpenBMC from source.",
      difficulty: "BEGINNER",
      estimatedMinutes: 30,
      hasCodeExercise: true,
      published: true,
    },
  });

  const lesson5 = await prisma.lesson.upsert({
    where: { slug: "development-workflow" },
    update: {
      sourceUrl: `${GITHUB_PAGES_BASE}/docs/01-getting-started/04-development-workflow`,
      repositoryPath: "docs/01-getting-started/04-development-workflow.md",
      displayMode: "RENDER",
    },
    create: {
      slug: "development-workflow",
      title: "Development Workflow",
      description: "Learn the OpenBMC development workflow and best practices",
      sourceUrl: `${GITHUB_PAGES_BASE}/docs/01-getting-started/04-development-workflow`,
      repositoryPath: "docs/01-getting-started/04-development-workflow.md",
      displayMode: "RENDER",
      content: "# Development Workflow\n\nLearn the recommended development workflow.",
      difficulty: "BEGINNER",
      estimatedMinutes: 25,
      published: true,
    },
  });

  const lesson6 = await prisma.lesson.upsert({
    where: { slug: "qemu-development" },
    update: {
      sourceUrl: `${GITHUB_PAGES_BASE}/docs/01-getting-started/05-qemu-build`,
      repositoryPath: "docs/01-getting-started/05-qemu-build.md",
      displayMode: "RENDER",
    },
    create: {
      slug: "qemu-development",
      title: "QEMU Development Environment",
      description: "Set up and use QEMU for OpenBMC development and testing",
      sourceUrl: `${GITHUB_PAGES_BASE}/docs/01-getting-started/05-qemu-build`,
      repositoryPath: "docs/01-getting-started/05-qemu-build.md",
      displayMode: "RENDER",
      content: "# QEMU Development\n\nLearn to use QEMU for testing OpenBMC.",
      difficulty: "BEGINNER",
      estimatedMinutes: 35,
      hasCodeExercise: true,
      published: true,
    },
  });

  // Link lessons to path
  await prisma.pathLesson.upsert({
    where: { pathId_lessonId: { pathId: gettingStartedPath.id, lessonId: lesson1.id } },
    update: {},
    create: { pathId: gettingStartedPath.id, lessonId: lesson1.id, order: 1 },
  });

  await prisma.pathLesson.upsert({
    where: { pathId_lessonId: { pathId: gettingStartedPath.id, lessonId: lesson2.id } },
    update: {},
    create: { pathId: gettingStartedPath.id, lessonId: lesson2.id, order: 2 },
  });

  await prisma.pathLesson.upsert({
    where: { pathId_lessonId: { pathId: gettingStartedPath.id, lessonId: lesson3.id } },
    update: {},
    create: { pathId: gettingStartedPath.id, lessonId: lesson3.id, order: 3 },
  });

  await prisma.pathLesson.upsert({
    where: { pathId_lessonId: { pathId: gettingStartedPath.id, lessonId: lesson4.id } },
    update: {},
    create: { pathId: gettingStartedPath.id, lessonId: lesson4.id, order: 4 },
  });

  await prisma.pathLesson.upsert({
    where: { pathId_lessonId: { pathId: gettingStartedPath.id, lessonId: lesson5.id } },
    update: {},
    create: { pathId: gettingStartedPath.id, lessonId: lesson5.id, order: 5 },
  });

  await prisma.pathLesson.upsert({
    where: { pathId_lessonId: { pathId: gettingStartedPath.id, lessonId: lesson6.id } },
    update: {},
    create: { pathId: gettingStartedPath.id, lessonId: lesson6.id, order: 6 },
  });

  console.log("Created lessons for Getting Started path (6 lessons)");

  // Create D-Bus lessons
  const dbusLesson1 = await prisma.lesson.upsert({
    where: { slug: "dbus-introduction" },
    update: {
      sourceUrl: `${GITHUB_PAGES_BASE}/docs/02-architecture/02-dbus-guide`,
      repositoryPath: "docs/02-architecture/02-dbus-guide.md",
      displayMode: "RENDER",
    },
    create: {
      slug: "dbus-introduction",
      title: "Introduction to D-Bus",
      description: "Learn the fundamentals of D-Bus communication",
      sourceUrl: `${GITHUB_PAGES_BASE}/docs/02-architecture/02-dbus-guide`,
      repositoryPath: "docs/02-architecture/02-dbus-guide.md",
      displayMode: "RENDER",
      content: `# Introduction to D-Bus

D-Bus is a message bus system that provides a way for applications to communicate with each other.

## Core Concepts

### Bus Types
- **System Bus**: For system-wide services (used by OpenBMC)
- **Session Bus**: For user-specific applications

### Key Terms
- **Service**: A named connection to the bus (e.g., \`xyz.openbmc_project.State.Host\`)
- **Object Path**: Location of an object (e.g., \`/xyz/openbmc_project/state/host0\`)
- **Interface**: A set of methods, signals, and properties
- **Member**: A specific method, signal, or property

## Exploring D-Bus with busctl

\`\`\`bash
# List all services
busctl list

# Introspect a service
busctl introspect xyz.openbmc_project.State.Host /xyz/openbmc_project/state/host0

# Get a property
busctl get-property xyz.openbmc_project.State.Host \\
    /xyz/openbmc_project/state/host0 \\
    xyz.openbmc_project.State.Host CurrentHostState
\`\`\`

## Next Steps

In the following lessons, we'll explore methods, signals, and properties in detail.
`,
      difficulty: "INTERMEDIATE",
      estimatedMinutes: 20,
      published: true,
    },
  });

  // Additional D-Bus lessons
  const dbusLesson2 = await prisma.lesson.upsert({
    where: { slug: "state-manager" },
    update: {
      sourceUrl: `${GITHUB_PAGES_BASE}/docs/02-architecture/03-state-manager-guide`,
      repositoryPath: "docs/02-architecture/03-state-manager-guide.md",
      displayMode: "RENDER",
    },
    create: {
      slug: "state-manager",
      title: "State Manager Guide",
      description: "Learn how OpenBMC manages system states via D-Bus",
      sourceUrl: `${GITHUB_PAGES_BASE}/docs/02-architecture/03-state-manager-guide`,
      repositoryPath: "docs/02-architecture/03-state-manager-guide.md",
      displayMode: "RENDER",
      content: "# State Manager Guide\n\nLearn about OpenBMC state management.",
      difficulty: "INTERMEDIATE",
      estimatedMinutes: 30,
      published: true,
    },
  });

  await prisma.pathLesson.upsert({
    where: { pathId_lessonId: { pathId: dbusPath.id, lessonId: dbusLesson1.id } },
    update: {},
    create: { pathId: dbusPath.id, lessonId: dbusLesson1.id, order: 1 },
  });

  await prisma.pathLesson.upsert({
    where: { pathId_lessonId: { pathId: dbusPath.id, lessonId: dbusLesson2.id } },
    update: {},
    create: { pathId: dbusPath.id, lessonId: dbusLesson2.id, order: 2 },
  });

  console.log("Created D-Bus lessons (2 lessons)");

  // Create Sensor Management lessons
  const sensorLesson1 = await prisma.lesson.upsert({
    where: { slug: "sensor-overview" },
    update: {
      sourceUrl: `${GITHUB_PAGES_BASE}/docs/03-core-services/01-dbus-sensors-guide`,
      repositoryPath: "docs/03-core-services/01-dbus-sensors-guide.md",
      displayMode: "RENDER",
    },
    create: {
      slug: "sensor-overview",
      title: "Sensor Overview in OpenBMC",
      description: "Understanding the sensor architecture in OpenBMC",
      sourceUrl: `${GITHUB_PAGES_BASE}/docs/03-core-services/01-dbus-sensors-guide`,
      repositoryPath: "docs/03-core-services/01-dbus-sensors-guide.md",
      displayMode: "RENDER",
      content: `# Sensor Overview in OpenBMC

OpenBMC provides comprehensive sensor monitoring capabilities for hardware management.

## Sensor Types

- **Temperature sensors**: Monitor CPU, memory, and ambient temperatures
- **Voltage sensors**: Track power rail voltages
- **Fan sensors**: Monitor fan speeds (RPM)
- **Power sensors**: Measure power consumption

## Sensor Architecture

Sensors in OpenBMC are exposed via D-Bus interfaces under \`xyz.openbmc_project.Sensor\`.

\`\`\`bash
# List all sensors
busctl tree xyz.openbmc_project.HwmonTempSensor
\`\`\`

## Key Interfaces

- \`xyz.openbmc_project.Sensor.Value\`: Current sensor reading
- \`xyz.openbmc_project.Sensor.Threshold.Critical\`: Critical thresholds
- \`xyz.openbmc_project.Sensor.Threshold.Warning\`: Warning thresholds
`,
      difficulty: "INTERMEDIATE",
      estimatedMinutes: 20,
      published: true,
    },
  });

  const sensorLesson2 = await prisma.lesson.upsert({
    where: { slug: "sensor-configuration" },
    update: {
      sourceUrl: `${GITHUB_PAGES_BASE}/docs/03-core-services/03-entity-manager-guide`,
      repositoryPath: "docs/03-core-services/03-entity-manager-guide.md",
      displayMode: "RENDER",
    },
    create: {
      slug: "sensor-configuration",
      title: "Configuring Sensors",
      description: "Learn how to configure and customize sensor behavior",
      sourceUrl: `${GITHUB_PAGES_BASE}/docs/03-core-services/03-entity-manager-guide`,
      repositoryPath: "docs/03-core-services/03-entity-manager-guide.md",
      displayMode: "RENDER",
      content: `# Configuring Sensors

This lesson covers sensor configuration in OpenBMC.

## Entity Manager

Entity Manager uses JSON configuration files to define sensors:

\`\`\`json
{
  "Name": "CPU_Temp",
  "Type": "temperature",
  "Index": 0,
  "Thresholds": [
    {"Direction": "greater than", "Severity": "Warning", "Value": 85},
    {"Direction": "greater than", "Severity": "Critical", "Value": 95}
  ]
}
\`\`\`

## Hwmon Integration

OpenBMC reads hardware sensors via the Linux hwmon subsystem.

## Best Practices

1. Set appropriate thresholds for your hardware
2. Use meaningful sensor names
3. Configure polling intervals based on criticality
`,
      difficulty: "INTERMEDIATE",
      estimatedMinutes: 25,
      published: true,
    },
  });

  // Additional Sensor Management lessons
  const sensorLesson3 = await prisma.lesson.upsert({
    where: { slug: "hwmon-sensors" },
    update: {
      sourceUrl: `${GITHUB_PAGES_BASE}/docs/03-core-services/02-hwmon-sensors-guide`,
      repositoryPath: "docs/03-core-services/02-hwmon-sensors-guide.md",
      displayMode: "RENDER",
    },
    create: {
      slug: "hwmon-sensors",
      title: "Hwmon Sensors Guide",
      description: "Working with Linux hwmon sensors in OpenBMC",
      sourceUrl: `${GITHUB_PAGES_BASE}/docs/03-core-services/02-hwmon-sensors-guide`,
      repositoryPath: "docs/03-core-services/02-hwmon-sensors-guide.md",
      displayMode: "RENDER",
      content: "# Hwmon Sensors Guide\n\nLearn about hwmon sensor integration.",
      difficulty: "INTERMEDIATE",
      estimatedMinutes: 25,
      published: true,
    },
  });

  const sensorLesson4 = await prisma.lesson.upsert({
    where: { slug: "fan-control" },
    update: {
      sourceUrl: `${GITHUB_PAGES_BASE}/docs/03-core-services/04-fan-control-guide`,
      repositoryPath: "docs/03-core-services/04-fan-control-guide.md",
      displayMode: "RENDER",
    },
    create: {
      slug: "fan-control",
      title: "Fan Control Guide",
      description: "Configure and manage fan control in OpenBMC",
      sourceUrl: `${GITHUB_PAGES_BASE}/docs/03-core-services/04-fan-control-guide`,
      repositoryPath: "docs/03-core-services/04-fan-control-guide.md",
      displayMode: "RENDER",
      content: "# Fan Control Guide\n\nLearn about fan control and thermal management.",
      difficulty: "INTERMEDIATE",
      estimatedMinutes: 30,
      published: true,
    },
  });

  const sensorLesson5 = await prisma.lesson.upsert({
    where: { slug: "power-management" },
    update: {
      sourceUrl: `${GITHUB_PAGES_BASE}/docs/03-core-services/05-power-management-guide`,
      repositoryPath: "docs/03-core-services/05-power-management-guide.md",
      displayMode: "RENDER",
    },
    create: {
      slug: "power-management",
      title: "Power Management Guide",
      description: "Understanding power management in OpenBMC",
      sourceUrl: `${GITHUB_PAGES_BASE}/docs/03-core-services/05-power-management-guide`,
      repositoryPath: "docs/03-core-services/05-power-management-guide.md",
      displayMode: "RENDER",
      content: "# Power Management Guide\n\nLearn about power management services.",
      difficulty: "INTERMEDIATE",
      estimatedMinutes: 25,
      published: true,
    },
  });

  const sensorLesson6 = await prisma.lesson.upsert({
    where: { slug: "inventory-manager" },
    update: {
      sourceUrl: `${GITHUB_PAGES_BASE}/docs/03-core-services/11-inventory-manager-guide`,
      repositoryPath: "docs/03-core-services/11-inventory-manager-guide.md",
      displayMode: "RENDER",
    },
    create: {
      slug: "inventory-manager",
      title: "Inventory Manager Guide",
      description: "Managing hardware inventory in OpenBMC",
      sourceUrl: `${GITHUB_PAGES_BASE}/docs/03-core-services/11-inventory-manager-guide`,
      repositoryPath: "docs/03-core-services/11-inventory-manager-guide.md",
      displayMode: "RENDER",
      content: "# Inventory Manager Guide\n\nLearn about inventory management.",
      difficulty: "INTERMEDIATE",
      estimatedMinutes: 20,
      published: true,
    },
  });

  await prisma.pathLesson.upsert({
    where: { pathId_lessonId: { pathId: sensorsPath.id, lessonId: sensorLesson1.id } },
    update: {},
    create: { pathId: sensorsPath.id, lessonId: sensorLesson1.id, order: 1 },
  });

  await prisma.pathLesson.upsert({
    where: { pathId_lessonId: { pathId: sensorsPath.id, lessonId: sensorLesson2.id } },
    update: {},
    create: { pathId: sensorsPath.id, lessonId: sensorLesson2.id, order: 2 },
  });

  await prisma.pathLesson.upsert({
    where: { pathId_lessonId: { pathId: sensorsPath.id, lessonId: sensorLesson3.id } },
    update: {},
    create: { pathId: sensorsPath.id, lessonId: sensorLesson3.id, order: 3 },
  });

  await prisma.pathLesson.upsert({
    where: { pathId_lessonId: { pathId: sensorsPath.id, lessonId: sensorLesson4.id } },
    update: {},
    create: { pathId: sensorsPath.id, lessonId: sensorLesson4.id, order: 4 },
  });

  await prisma.pathLesson.upsert({
    where: { pathId_lessonId: { pathId: sensorsPath.id, lessonId: sensorLesson5.id } },
    update: {},
    create: { pathId: sensorsPath.id, lessonId: sensorLesson5.id, order: 5 },
  });

  await prisma.pathLesson.upsert({
    where: { pathId_lessonId: { pathId: sensorsPath.id, lessonId: sensorLesson6.id } },
    update: {},
    create: { pathId: sensorsPath.id, lessonId: sensorLesson6.id, order: 6 },
  });

  console.log("Created Sensor Management lessons (6 lessons)");

  // Create Yocto Recipes lessons
  const recipeLesson1 = await prisma.lesson.upsert({
    where: { slug: "recipe-basics" },
    update: {
      sourceUrl: `${GITHUB_PAGES_BASE}/docs/06-porting/02-machine-layer`,
      repositoryPath: "docs/06-porting/02-machine-layer.md",
      displayMode: "RENDER",
    },
    create: {
      slug: "recipe-basics",
      title: "Yocto Recipe Basics",
      description: "Introduction to writing Yocto recipes for OpenBMC",
      sourceUrl: `${GITHUB_PAGES_BASE}/docs/06-porting/02-machine-layer`,
      repositoryPath: "docs/06-porting/02-machine-layer.md",
      displayMode: "RENDER",
      content: `# Yocto Recipe Basics

Learn the fundamentals of writing Yocto recipes for OpenBMC.

## Recipe Structure

A basic recipe includes:

\`\`\`bash
SUMMARY = "My OpenBMC Application"
DESCRIPTION = "A custom application for OpenBMC"
LICENSE = "Apache-2.0"
LIC_FILES_CHKSUM = "file://LICENSE;md5=..."

SRC_URI = "git://github.com/example/repo.git;branch=main;protocol=https"
SRCREV = "abc123..."

S = "\${WORKDIR}/git"

inherit meson

DEPENDS = "sdbusplus phosphor-logging"
\`\`\`

## Key Variables

- \`SRC_URI\`: Where to fetch source code
- \`DEPENDS\`: Build-time dependencies
- \`RDEPENDS\`: Runtime dependencies

## Inheritance

Common classes: \`meson\`, \`cmake\`, \`systemd\`, \`obmc-phosphor-systemd\`
`,
      difficulty: "ADVANCED",
      estimatedMinutes: 30,
      published: true,
    },
  });

  await prisma.pathLesson.upsert({
    where: { pathId_lessonId: { pathId: recipesPath.id, lessonId: recipeLesson1.id } },
    update: {},
    create: { pathId: recipesPath.id, lessonId: recipeLesson1.id, order: 1 },
  });

  console.log("Created Yocto Recipes lessons");

  // ============================================================================
  // Additional Core Services Lessons (for Sensor Management path)
  // ============================================================================
  const coreLesson1 = await prisma.lesson.upsert({
    where: { slug: "user-manager" },
    update: {
      sourceUrl: `${GITHUB_PAGES_BASE}/docs/03-core-services/06-user-manager-guide`,
      repositoryPath: "docs/03-core-services/06-user-manager-guide.md",
      displayMode: "RENDER",
    },
    create: {
      slug: "user-manager",
      title: "User Manager Guide",
      description: "Managing users and authentication in OpenBMC",
      sourceUrl: `${GITHUB_PAGES_BASE}/docs/03-core-services/06-user-manager-guide`,
      repositoryPath: "docs/03-core-services/06-user-manager-guide.md",
      displayMode: "RENDER",
      content: "# User Manager Guide",
      difficulty: "INTERMEDIATE",
      estimatedMinutes: 25,
      published: true,
    },
  });
  const coreLesson2 = await prisma.lesson.upsert({
    where: { slug: "network-guide" },
    update: {
      sourceUrl: `${GITHUB_PAGES_BASE}/docs/03-core-services/07-network-guide`,
      repositoryPath: "docs/03-core-services/07-network-guide.md",
      displayMode: "RENDER",
    },
    create: {
      slug: "network-guide",
      title: "Network Configuration Guide",
      description: "Configure networking in OpenBMC",
      sourceUrl: `${GITHUB_PAGES_BASE}/docs/03-core-services/07-network-guide`,
      repositoryPath: "docs/03-core-services/07-network-guide.md",
      displayMode: "RENDER",
      content: "# Network Guide",
      difficulty: "INTERMEDIATE",
      estimatedMinutes: 30,
      published: true,
    },
  });
  const coreLesson3 = await prisma.lesson.upsert({
    where: { slug: "led-manager" },
    update: {
      sourceUrl: `${GITHUB_PAGES_BASE}/docs/03-core-services/08-led-manager-guide`,
      repositoryPath: "docs/03-core-services/08-led-manager-guide.md",
      displayMode: "RENDER",
    },
    create: {
      slug: "led-manager",
      title: "LED Manager Guide",
      description: "Control system LEDs in OpenBMC",
      sourceUrl: `${GITHUB_PAGES_BASE}/docs/03-core-services/08-led-manager-guide`,
      repositoryPath: "docs/03-core-services/08-led-manager-guide.md",
      displayMode: "RENDER",
      content: "# LED Manager Guide",
      difficulty: "INTERMEDIATE",
      estimatedMinutes: 20,
      published: true,
    },
  });
  const coreLesson4 = await prisma.lesson.upsert({
    where: { slug: "certificate-manager" },
    update: {
      sourceUrl: `${GITHUB_PAGES_BASE}/docs/03-core-services/09-certificate-manager-guide`,
      repositoryPath: "docs/03-core-services/09-certificate-manager-guide.md",
      displayMode: "RENDER",
    },
    create: {
      slug: "certificate-manager",
      title: "Certificate Manager Guide",
      description: "Manage SSL/TLS certificates in OpenBMC",
      sourceUrl: `${GITHUB_PAGES_BASE}/docs/03-core-services/09-certificate-manager-guide`,
      repositoryPath: "docs/03-core-services/09-certificate-manager-guide.md",
      displayMode: "RENDER",
      content: "# Certificate Manager Guide",
      difficulty: "INTERMEDIATE",
      estimatedMinutes: 25,
      published: true,
    },
  });
  const coreLesson5 = await prisma.lesson.upsert({
    where: { slug: "time-manager" },
    update: {
      sourceUrl: `${GITHUB_PAGES_BASE}/docs/03-core-services/10-time-manager-guide`,
      repositoryPath: "docs/03-core-services/10-time-manager-guide.md",
      displayMode: "RENDER",
    },
    create: {
      slug: "time-manager",
      title: "Time Manager Guide",
      description: "Time synchronization in OpenBMC",
      sourceUrl: `${GITHUB_PAGES_BASE}/docs/03-core-services/10-time-manager-guide`,
      repositoryPath: "docs/03-core-services/10-time-manager-guide.md",
      displayMode: "RENDER",
      content: "# Time Manager Guide",
      difficulty: "INTERMEDIATE",
      estimatedMinutes: 15,
      published: true,
    },
  });
  const coreLesson6 = await prisma.lesson.upsert({
    where: { slug: "watchdog-guide" },
    update: {
      sourceUrl: `${GITHUB_PAGES_BASE}/docs/03-core-services/12-watchdog-guide`,
      repositoryPath: "docs/03-core-services/12-watchdog-guide.md",
      displayMode: "RENDER",
    },
    create: {
      slug: "watchdog-guide",
      title: "Watchdog Guide",
      description: "Hardware watchdog management in OpenBMC",
      sourceUrl: `${GITHUB_PAGES_BASE}/docs/03-core-services/12-watchdog-guide`,
      repositoryPath: "docs/03-core-services/12-watchdog-guide.md",
      displayMode: "RENDER",
      content: "# Watchdog Guide",
      difficulty: "INTERMEDIATE",
      estimatedMinutes: 20,
      published: true,
    },
  });
  const coreLesson7 = await prisma.lesson.upsert({
    where: { slug: "buttons-guide" },
    update: {
      sourceUrl: `${GITHUB_PAGES_BASE}/docs/03-core-services/13-buttons-guide`,
      repositoryPath: "docs/03-core-services/13-buttons-guide.md",
      displayMode: "RENDER",
    },
    create: {
      slug: "buttons-guide",
      title: "Buttons Guide",
      description: "Handle physical buttons in OpenBMC",
      sourceUrl: `${GITHUB_PAGES_BASE}/docs/03-core-services/13-buttons-guide`,
      repositoryPath: "docs/03-core-services/13-buttons-guide.md",
      displayMode: "RENDER",
      content: "# Buttons Guide",
      difficulty: "INTERMEDIATE",
      estimatedMinutes: 15,
      published: true,
    },
  });

  // Link additional core lessons to Sensor Management path
  await prisma.pathLesson.upsert({
    where: { pathId_lessonId: { pathId: sensorsPath.id, lessonId: coreLesson1.id } },
    update: {},
    create: { pathId: sensorsPath.id, lessonId: coreLesson1.id, order: 7 },
  });
  await prisma.pathLesson.upsert({
    where: { pathId_lessonId: { pathId: sensorsPath.id, lessonId: coreLesson2.id } },
    update: {},
    create: { pathId: sensorsPath.id, lessonId: coreLesson2.id, order: 8 },
  });
  await prisma.pathLesson.upsert({
    where: { pathId_lessonId: { pathId: sensorsPath.id, lessonId: coreLesson3.id } },
    update: {},
    create: { pathId: sensorsPath.id, lessonId: coreLesson3.id, order: 9 },
  });
  await prisma.pathLesson.upsert({
    where: { pathId_lessonId: { pathId: sensorsPath.id, lessonId: coreLesson4.id } },
    update: {},
    create: { pathId: sensorsPath.id, lessonId: coreLesson4.id, order: 10 },
  });
  await prisma.pathLesson.upsert({
    where: { pathId_lessonId: { pathId: sensorsPath.id, lessonId: coreLesson5.id } },
    update: {},
    create: { pathId: sensorsPath.id, lessonId: coreLesson5.id, order: 11 },
  });
  await prisma.pathLesson.upsert({
    where: { pathId_lessonId: { pathId: sensorsPath.id, lessonId: coreLesson6.id } },
    update: {},
    create: { pathId: sensorsPath.id, lessonId: coreLesson6.id, order: 12 },
  });
  await prisma.pathLesson.upsert({
    where: { pathId_lessonId: { pathId: sensorsPath.id, lessonId: coreLesson7.id } },
    update: {},
    create: { pathId: sensorsPath.id, lessonId: coreLesson7.id, order: 13 },
  });

  console.log("Created additional Core Services lessons (7 lessons)");

  // ============================================================================
  // Interfaces Lessons
  // ============================================================================
  const ifLesson1 = await prisma.lesson.upsert({
    where: { slug: "ipmi-guide" },
    update: {
      sourceUrl: `${GITHUB_PAGES_BASE}/docs/04-interfaces/01-ipmi-guide`,
      repositoryPath: "docs/04-interfaces/01-ipmi-guide.md",
      displayMode: "RENDER",
    },
    create: {
      slug: "ipmi-guide",
      title: "IPMI Guide",
      description: "Intelligent Platform Management Interface in OpenBMC",
      sourceUrl: `${GITHUB_PAGES_BASE}/docs/04-interfaces/01-ipmi-guide`,
      repositoryPath: "docs/04-interfaces/01-ipmi-guide.md",
      displayMode: "RENDER",
      content: "# IPMI Guide",
      difficulty: "INTERMEDIATE",
      estimatedMinutes: 35,
      published: true,
    },
  });
  const ifLesson2 = await prisma.lesson.upsert({
    where: { slug: "redfish-guide" },
    update: {
      sourceUrl: `${GITHUB_PAGES_BASE}/docs/04-interfaces/02-redfish-guide`,
      repositoryPath: "docs/04-interfaces/02-redfish-guide.md",
      displayMode: "RENDER",
    },
    create: {
      slug: "redfish-guide",
      title: "Redfish API Guide",
      description: "RESTful API for server management",
      sourceUrl: `${GITHUB_PAGES_BASE}/docs/04-interfaces/02-redfish-guide`,
      repositoryPath: "docs/04-interfaces/02-redfish-guide.md",
      displayMode: "RENDER",
      content: "# Redfish Guide",
      difficulty: "INTERMEDIATE",
      estimatedMinutes: 40,
      published: true,
    },
  });
  const ifLesson3 = await prisma.lesson.upsert({
    where: { slug: "webui-guide" },
    update: {
      sourceUrl: `${GITHUB_PAGES_BASE}/docs/04-interfaces/03-webui-guide`,
      repositoryPath: "docs/04-interfaces/03-webui-guide.md",
      displayMode: "RENDER",
    },
    create: {
      slug: "webui-guide",
      title: "Web UI Guide",
      description: "OpenBMC web interface",
      sourceUrl: `${GITHUB_PAGES_BASE}/docs/04-interfaces/03-webui-guide`,
      repositoryPath: "docs/04-interfaces/03-webui-guide.md",
      displayMode: "RENDER",
      content: "# Web UI Guide",
      difficulty: "INTERMEDIATE",
      estimatedMinutes: 25,
      published: true,
    },
  });
  const ifLesson4 = await prisma.lesson.upsert({
    where: { slug: "kvm-guide" },
    update: {
      sourceUrl: `${GITHUB_PAGES_BASE}/docs/04-interfaces/04-kvm-guide`,
      repositoryPath: "docs/04-interfaces/04-kvm-guide.md",
      displayMode: "RENDER",
    },
    create: {
      slug: "kvm-guide",
      title: "KVM Guide",
      description: "Keyboard, Video, Mouse over IP",
      sourceUrl: `${GITHUB_PAGES_BASE}/docs/04-interfaces/04-kvm-guide`,
      repositoryPath: "docs/04-interfaces/04-kvm-guide.md",
      displayMode: "RENDER",
      content: "# KVM Guide",
      difficulty: "INTERMEDIATE",
      estimatedMinutes: 30,
      published: true,
    },
  });
  const ifLesson5 = await prisma.lesson.upsert({
    where: { slug: "virtual-media-guide" },
    update: {
      sourceUrl: `${GITHUB_PAGES_BASE}/docs/04-interfaces/05-virtual-media-guide`,
      repositoryPath: "docs/04-interfaces/05-virtual-media-guide.md",
      displayMode: "RENDER",
    },
    create: {
      slug: "virtual-media-guide",
      title: "Virtual Media Guide",
      description: "Remote media mounting",
      sourceUrl: `${GITHUB_PAGES_BASE}/docs/04-interfaces/05-virtual-media-guide`,
      repositoryPath: "docs/04-interfaces/05-virtual-media-guide.md",
      displayMode: "RENDER",
      content: "# Virtual Media Guide",
      difficulty: "INTERMEDIATE",
      estimatedMinutes: 25,
      published: true,
    },
  });
  const ifLesson6 = await prisma.lesson.upsert({
    where: { slug: "console-guide" },
    update: {
      sourceUrl: `${GITHUB_PAGES_BASE}/docs/04-interfaces/06-console-guide`,
      repositoryPath: "docs/04-interfaces/06-console-guide.md",
      displayMode: "RENDER",
    },
    create: {
      slug: "console-guide",
      title: "Serial Console Guide",
      description: "Serial over LAN (SOL)",
      sourceUrl: `${GITHUB_PAGES_BASE}/docs/04-interfaces/06-console-guide`,
      repositoryPath: "docs/04-interfaces/06-console-guide.md",
      displayMode: "RENDER",
      content: "# Console Guide",
      difficulty: "INTERMEDIATE",
      estimatedMinutes: 20,
      published: true,
    },
  });
  const ifLesson7 = await prisma.lesson.upsert({
    where: { slug: "ssh-security-guide" },
    update: {
      sourceUrl: `${GITHUB_PAGES_BASE}/docs/04-interfaces/07-ssh-security-guide`,
      repositoryPath: "docs/04-interfaces/07-ssh-security-guide.md",
      displayMode: "RENDER",
    },
    create: {
      slug: "ssh-security-guide",
      title: "SSH Security Guide",
      description: "Secure shell configuration",
      sourceUrl: `${GITHUB_PAGES_BASE}/docs/04-interfaces/07-ssh-security-guide`,
      repositoryPath: "docs/04-interfaces/07-ssh-security-guide.md",
      displayMode: "RENDER",
      content: "# SSH Security Guide",
      difficulty: "INTERMEDIATE",
      estimatedMinutes: 20,
      published: true,
    },
  });

  // Link interfaces lessons
  await prisma.pathLesson.upsert({
    where: { pathId_lessonId: { pathId: interfacesPath.id, lessonId: ifLesson1.id } },
    update: {},
    create: { pathId: interfacesPath.id, lessonId: ifLesson1.id, order: 1 },
  });
  await prisma.pathLesson.upsert({
    where: { pathId_lessonId: { pathId: interfacesPath.id, lessonId: ifLesson2.id } },
    update: {},
    create: { pathId: interfacesPath.id, lessonId: ifLesson2.id, order: 2 },
  });
  await prisma.pathLesson.upsert({
    where: { pathId_lessonId: { pathId: interfacesPath.id, lessonId: ifLesson3.id } },
    update: {},
    create: { pathId: interfacesPath.id, lessonId: ifLesson3.id, order: 3 },
  });
  await prisma.pathLesson.upsert({
    where: { pathId_lessonId: { pathId: interfacesPath.id, lessonId: ifLesson4.id } },
    update: {},
    create: { pathId: interfacesPath.id, lessonId: ifLesson4.id, order: 4 },
  });
  await prisma.pathLesson.upsert({
    where: { pathId_lessonId: { pathId: interfacesPath.id, lessonId: ifLesson5.id } },
    update: {},
    create: { pathId: interfacesPath.id, lessonId: ifLesson5.id, order: 5 },
  });
  await prisma.pathLesson.upsert({
    where: { pathId_lessonId: { pathId: interfacesPath.id, lessonId: ifLesson6.id } },
    update: {},
    create: { pathId: interfacesPath.id, lessonId: ifLesson6.id, order: 6 },
  });
  await prisma.pathLesson.upsert({
    where: { pathId_lessonId: { pathId: interfacesPath.id, lessonId: ifLesson7.id } },
    update: {},
    create: { pathId: interfacesPath.id, lessonId: ifLesson7.id, order: 7 },
  });

  console.log("Created Interfaces lessons (7 lessons)");

  // ============================================================================
  // Advanced Topics Lessons
  // ============================================================================
  const advLesson1 = await prisma.lesson.upsert({
    where: { slug: "mctp-pldm-guide" },
    update: {
      sourceUrl: `${GITHUB_PAGES_BASE}/docs/05-advanced/01-mctp-pldm-guide`,
      repositoryPath: "docs/05-advanced/01-mctp-pldm-guide.md",
      displayMode: "RENDER",
    },
    create: {
      slug: "mctp-pldm-guide",
      title: "MCTP & PLDM Guide",
      description: "Management Component Transport Protocol",
      sourceUrl: `${GITHUB_PAGES_BASE}/docs/05-advanced/01-mctp-pldm-guide`,
      repositoryPath: "docs/05-advanced/01-mctp-pldm-guide.md",
      displayMode: "RENDER",
      content: "# MCTP & PLDM Guide",
      difficulty: "ADVANCED",
      estimatedMinutes: 45,
      published: true,
    },
  });
  const advLesson2 = await prisma.lesson.upsert({
    where: { slug: "spdm-guide" },
    update: {
      sourceUrl: `${GITHUB_PAGES_BASE}/docs/05-advanced/02-spdm-guide`,
      repositoryPath: "docs/05-advanced/02-spdm-guide.md",
      displayMode: "RENDER",
    },
    create: {
      slug: "spdm-guide",
      title: "SPDM Guide",
      description: "Security Protocol and Data Model",
      sourceUrl: `${GITHUB_PAGES_BASE}/docs/05-advanced/02-spdm-guide`,
      repositoryPath: "docs/05-advanced/02-spdm-guide.md",
      displayMode: "RENDER",
      content: "# SPDM Guide",
      difficulty: "ADVANCED",
      estimatedMinutes: 40,
      published: true,
    },
  });
  const advLesson3 = await prisma.lesson.upsert({
    where: { slug: "firmware-update-guide" },
    update: {
      sourceUrl: `${GITHUB_PAGES_BASE}/docs/05-advanced/03-firmware-update-guide`,
      repositoryPath: "docs/05-advanced/03-firmware-update-guide.md",
      displayMode: "RENDER",
    },
    create: {
      slug: "firmware-update-guide",
      title: "Firmware Update Guide",
      description: "BMC and host firmware updates",
      sourceUrl: `${GITHUB_PAGES_BASE}/docs/05-advanced/03-firmware-update-guide`,
      repositoryPath: "docs/05-advanced/03-firmware-update-guide.md",
      displayMode: "RENDER",
      content: "# Firmware Update Guide",
      difficulty: "ADVANCED",
      estimatedMinutes: 35,
      published: true,
    },
  });
  const advLesson4 = await prisma.lesson.upsert({
    where: { slug: "intel-asd-acd-guide" },
    update: {
      sourceUrl: `${GITHUB_PAGES_BASE}/docs/05-advanced/04-intel-asd-acd-guide`,
      repositoryPath: "docs/05-advanced/04-intel-asd-acd-guide.md",
      displayMode: "RENDER",
    },
    create: {
      slug: "intel-asd-acd-guide",
      title: "Intel ASD/ACD Guide",
      description: "Intel At-Scale Debug",
      sourceUrl: `${GITHUB_PAGES_BASE}/docs/05-advanced/04-intel-asd-acd-guide`,
      repositoryPath: "docs/05-advanced/04-intel-asd-acd-guide.md",
      displayMode: "RENDER",
      content: "# Intel ASD/ACD Guide",
      difficulty: "ADVANCED",
      estimatedMinutes: 30,
      published: true,
    },
  });
  const advLesson5 = await prisma.lesson.upsert({
    where: { slug: "amd-ihdt-guide" },
    update: {
      sourceUrl: `${GITHUB_PAGES_BASE}/docs/05-advanced/05-amd-ihdt-guide`,
      repositoryPath: "docs/05-advanced/05-amd-ihdt-guide.md",
      displayMode: "RENDER",
    },
    create: {
      slug: "amd-ihdt-guide",
      title: "AMD IHDT Guide",
      description: "AMD In-Hardware Debug Tool",
      sourceUrl: `${GITHUB_PAGES_BASE}/docs/05-advanced/05-amd-ihdt-guide`,
      repositoryPath: "docs/05-advanced/05-amd-ihdt-guide.md",
      displayMode: "RENDER",
      content: "# AMD IHDT Guide",
      difficulty: "ADVANCED",
      estimatedMinutes: 30,
      published: true,
    },
  });
  const advLesson6 = await prisma.lesson.upsert({
    where: { slug: "logging-guide" },
    update: {
      sourceUrl: `${GITHUB_PAGES_BASE}/docs/05-advanced/06-logging-guide`,
      repositoryPath: "docs/05-advanced/06-logging-guide.md",
      displayMode: "RENDER",
    },
    create: {
      slug: "logging-guide",
      title: "Logging Guide",
      description: "Error logging and event management",
      sourceUrl: `${GITHUB_PAGES_BASE}/docs/05-advanced/06-logging-guide`,
      repositoryPath: "docs/05-advanced/06-logging-guide.md",
      displayMode: "RENDER",
      content: "# Logging Guide",
      difficulty: "ADVANCED",
      estimatedMinutes: 25,
      published: true,
    },
  });
  const advLesson7 = await prisma.lesson.upsert({
    where: { slug: "sdr-guide" },
    update: {
      sourceUrl: `${GITHUB_PAGES_BASE}/docs/05-advanced/07-sdr-guide`,
      repositoryPath: "docs/05-advanced/07-sdr-guide.md",
      displayMode: "RENDER",
    },
    create: {
      slug: "sdr-guide",
      title: "SDR Guide",
      description: "Sensor Data Records",
      sourceUrl: `${GITHUB_PAGES_BASE}/docs/05-advanced/07-sdr-guide`,
      repositoryPath: "docs/05-advanced/07-sdr-guide.md",
      displayMode: "RENDER",
      content: "# SDR Guide",
      difficulty: "ADVANCED",
      estimatedMinutes: 30,
      published: true,
    },
  });
  const advLesson8 = await prisma.lesson.upsert({
    where: { slug: "linux-debug-tools" },
    update: {
      sourceUrl: `${GITHUB_PAGES_BASE}/docs/05-advanced/08-linux-debug-tools-guide`,
      repositoryPath: "docs/05-advanced/08-linux-debug-tools-guide.md",
      displayMode: "RENDER",
    },
    create: {
      slug: "linux-debug-tools",
      title: "Linux Debug Tools",
      description: "Debugging techniques for OpenBMC",
      sourceUrl: `${GITHUB_PAGES_BASE}/docs/05-advanced/08-linux-debug-tools-guide`,
      repositoryPath: "docs/05-advanced/08-linux-debug-tools-guide.md",
      displayMode: "RENDER",
      content: "# Linux Debug Tools",
      difficulty: "ADVANCED",
      estimatedMinutes: 35,
      published: true,
    },
  });
  const advLesson9 = await prisma.lesson.upsert({
    where: { slug: "espi-guide" },
    update: {
      sourceUrl: `${GITHUB_PAGES_BASE}/docs/05-advanced/09-espi-guide`,
      repositoryPath: "docs/05-advanced/09-espi-guide.md",
      displayMode: "RENDER",
    },
    create: {
      slug: "espi-guide",
      title: "eSPI Guide",
      description: "Enhanced Serial Peripheral Interface",
      sourceUrl: `${GITHUB_PAGES_BASE}/docs/05-advanced/09-espi-guide`,
      repositoryPath: "docs/05-advanced/09-espi-guide.md",
      displayMode: "RENDER",
      content: "# eSPI Guide",
      difficulty: "ADVANCED",
      estimatedMinutes: 30,
      published: true,
    },
  });
  const advLesson10 = await prisma.lesson.upsert({
    where: { slug: "unit-testing-guide" },
    update: {
      sourceUrl: `${GITHUB_PAGES_BASE}/docs/05-advanced/10-unit-testing-guide`,
      repositoryPath: "docs/05-advanced/10-unit-testing-guide.md",
      displayMode: "RENDER",
    },
    create: {
      slug: "unit-testing-guide",
      title: "Unit Testing Guide",
      description: "Testing OpenBMC components",
      sourceUrl: `${GITHUB_PAGES_BASE}/docs/05-advanced/10-unit-testing-guide`,
      repositoryPath: "docs/05-advanced/10-unit-testing-guide.md",
      displayMode: "RENDER",
      content: "# Unit Testing Guide",
      difficulty: "ADVANCED",
      estimatedMinutes: 30,
      published: true,
    },
  });
  const advLesson11 = await prisma.lesson.upsert({
    where: { slug: "robot-framework-guide" },
    update: {
      sourceUrl: `${GITHUB_PAGES_BASE}/docs/05-advanced/11-robot-framework-guide`,
      repositoryPath: "docs/05-advanced/11-robot-framework-guide.md",
      displayMode: "RENDER",
    },
    create: {
      slug: "robot-framework-guide",
      title: "Robot Framework Guide",
      description: "Integration testing with Robot",
      sourceUrl: `${GITHUB_PAGES_BASE}/docs/05-advanced/11-robot-framework-guide`,
      repositoryPath: "docs/05-advanced/11-robot-framework-guide.md",
      displayMode: "RENDER",
      content: "# Robot Framework Guide",
      difficulty: "ADVANCED",
      estimatedMinutes: 35,
      published: true,
    },
  });

  // Link advanced lessons
  await prisma.pathLesson.upsert({
    where: { pathId_lessonId: { pathId: advancedPath.id, lessonId: advLesson1.id } },
    update: {},
    create: { pathId: advancedPath.id, lessonId: advLesson1.id, order: 1 },
  });
  await prisma.pathLesson.upsert({
    where: { pathId_lessonId: { pathId: advancedPath.id, lessonId: advLesson2.id } },
    update: {},
    create: { pathId: advancedPath.id, lessonId: advLesson2.id, order: 2 },
  });
  await prisma.pathLesson.upsert({
    where: { pathId_lessonId: { pathId: advancedPath.id, lessonId: advLesson3.id } },
    update: {},
    create: { pathId: advancedPath.id, lessonId: advLesson3.id, order: 3 },
  });
  await prisma.pathLesson.upsert({
    where: { pathId_lessonId: { pathId: advancedPath.id, lessonId: advLesson4.id } },
    update: {},
    create: { pathId: advancedPath.id, lessonId: advLesson4.id, order: 4 },
  });
  await prisma.pathLesson.upsert({
    where: { pathId_lessonId: { pathId: advancedPath.id, lessonId: advLesson5.id } },
    update: {},
    create: { pathId: advancedPath.id, lessonId: advLesson5.id, order: 5 },
  });
  await prisma.pathLesson.upsert({
    where: { pathId_lessonId: { pathId: advancedPath.id, lessonId: advLesson6.id } },
    update: {},
    create: { pathId: advancedPath.id, lessonId: advLesson6.id, order: 6 },
  });
  await prisma.pathLesson.upsert({
    where: { pathId_lessonId: { pathId: advancedPath.id, lessonId: advLesson7.id } },
    update: {},
    create: { pathId: advancedPath.id, lessonId: advLesson7.id, order: 7 },
  });
  await prisma.pathLesson.upsert({
    where: { pathId_lessonId: { pathId: advancedPath.id, lessonId: advLesson8.id } },
    update: {},
    create: { pathId: advancedPath.id, lessonId: advLesson8.id, order: 8 },
  });
  await prisma.pathLesson.upsert({
    where: { pathId_lessonId: { pathId: advancedPath.id, lessonId: advLesson9.id } },
    update: {},
    create: { pathId: advancedPath.id, lessonId: advLesson9.id, order: 9 },
  });
  await prisma.pathLesson.upsert({
    where: { pathId_lessonId: { pathId: advancedPath.id, lessonId: advLesson10.id } },
    update: {},
    create: { pathId: advancedPath.id, lessonId: advLesson10.id, order: 10 },
  });
  await prisma.pathLesson.upsert({
    where: { pathId_lessonId: { pathId: advancedPath.id, lessonId: advLesson11.id } },
    update: {},
    create: { pathId: advancedPath.id, lessonId: advLesson11.id, order: 11 },
  });

  console.log("Created Advanced Topics lessons (11 lessons)");

  // ============================================================================
  // Platform Porting Lessons
  // ============================================================================
  const portLesson1 = await prisma.lesson.upsert({
    where: { slug: "porting-reference" },
    update: {
      sourceUrl: `${GITHUB_PAGES_BASE}/docs/06-porting/01-porting-reference`,
      repositoryPath: "docs/06-porting/01-porting-reference.md",
      displayMode: "RENDER",
    },
    create: {
      slug: "porting-reference",
      title: "Porting Reference",
      description: "OpenBMC porting overview",
      sourceUrl: `${GITHUB_PAGES_BASE}/docs/06-porting/01-porting-reference`,
      repositoryPath: "docs/06-porting/01-porting-reference.md",
      displayMode: "RENDER",
      content: "# Porting Reference",
      difficulty: "ADVANCED",
      estimatedMinutes: 40,
      published: true,
    },
  });
  const portLesson2 = await prisma.lesson.upsert({
    where: { slug: "device-tree-guide" },
    update: {
      sourceUrl: `${GITHUB_PAGES_BASE}/docs/06-porting/03-device-tree`,
      repositoryPath: "docs/06-porting/03-device-tree.md",
      displayMode: "RENDER",
    },
    create: {
      slug: "device-tree-guide",
      title: "Device Tree Guide",
      description: "Hardware description for Linux",
      sourceUrl: `${GITHUB_PAGES_BASE}/docs/06-porting/03-device-tree`,
      repositoryPath: "docs/06-porting/03-device-tree.md",
      displayMode: "RENDER",
      content: "# Device Tree Guide",
      difficulty: "ADVANCED",
      estimatedMinutes: 45,
      published: true,
    },
  });
  const portLesson3 = await prisma.lesson.upsert({
    where: { slug: "uboot-guide" },
    update: {
      sourceUrl: `${GITHUB_PAGES_BASE}/docs/06-porting/04-uboot`,
      repositoryPath: "docs/06-porting/04-uboot.md",
      displayMode: "RENDER",
    },
    create: {
      slug: "uboot-guide",
      title: "U-Boot Guide",
      description: "Bootloader configuration",
      sourceUrl: `${GITHUB_PAGES_BASE}/docs/06-porting/04-uboot`,
      repositoryPath: "docs/06-porting/04-uboot.md",
      displayMode: "RENDER",
      content: "# U-Boot Guide",
      difficulty: "ADVANCED",
      estimatedMinutes: 40,
      published: true,
    },
  });
  const portLesson4 = await prisma.lesson.upsert({
    where: { slug: "verification-guide" },
    update: {
      sourceUrl: `${GITHUB_PAGES_BASE}/docs/06-porting/05-verification`,
      repositoryPath: "docs/06-porting/05-verification.md",
      displayMode: "RENDER",
    },
    create: {
      slug: "verification-guide",
      title: "Verification Guide",
      description: "Testing your port",
      sourceUrl: `${GITHUB_PAGES_BASE}/docs/06-porting/05-verification`,
      repositoryPath: "docs/06-porting/05-verification.md",
      displayMode: "RENDER",
      content: "# Verification Guide",
      difficulty: "ADVANCED",
      estimatedMinutes: 30,
      published: true,
    },
  });
  const portLesson5 = await prisma.lesson.upsert({
    where: { slug: "arm-platform-guide" },
    update: {
      sourceUrl: `${GITHUB_PAGES_BASE}/docs/06-porting/06-arm-platform-guide`,
      repositoryPath: "docs/06-porting/06-arm-platform-guide.md",
      displayMode: "RENDER",
    },
    create: {
      slug: "arm-platform-guide",
      title: "ARM Platform Guide",
      description: "ARM-specific porting",
      sourceUrl: `${GITHUB_PAGES_BASE}/docs/06-porting/06-arm-platform-guide`,
      repositoryPath: "docs/06-porting/06-arm-platform-guide.md",
      displayMode: "RENDER",
      content: "# ARM Platform Guide",
      difficulty: "ADVANCED",
      estimatedMinutes: 35,
      published: true,
    },
  });
  const portLesson6 = await prisma.lesson.upsert({
    where: { slug: "entity-manager-advanced" },
    update: {
      sourceUrl: `${GITHUB_PAGES_BASE}/docs/06-porting/07-entity-manager-advanced`,
      repositoryPath: "docs/06-porting/07-entity-manager-advanced.md",
      displayMode: "RENDER",
    },
    create: {
      slug: "entity-manager-advanced",
      title: "Entity Manager Advanced",
      description: "Advanced Entity Manager configuration",
      sourceUrl: `${GITHUB_PAGES_BASE}/docs/06-porting/07-entity-manager-advanced`,
      repositoryPath: "docs/06-porting/07-entity-manager-advanced.md",
      displayMode: "RENDER",
      content: "# Entity Manager Advanced",
      difficulty: "ADVANCED",
      estimatedMinutes: 40,
      published: true,
    },
  });

  // Link porting lessons (recipe-basics is already order 1)
  await prisma.pathLesson.upsert({
    where: { pathId_lessonId: { pathId: portingPath.id, lessonId: portLesson1.id } },
    update: {},
    create: { pathId: portingPath.id, lessonId: portLesson1.id, order: 1 },
  });
  await prisma.pathLesson.upsert({
    where: { pathId_lessonId: { pathId: portingPath.id, lessonId: recipeLesson1.id } },
    update: {},
    create: { pathId: portingPath.id, lessonId: recipeLesson1.id, order: 2 },
  });
  await prisma.pathLesson.upsert({
    where: { pathId_lessonId: { pathId: portingPath.id, lessonId: portLesson2.id } },
    update: {},
    create: { pathId: portingPath.id, lessonId: portLesson2.id, order: 3 },
  });
  await prisma.pathLesson.upsert({
    where: { pathId_lessonId: { pathId: portingPath.id, lessonId: portLesson3.id } },
    update: {},
    create: { pathId: portingPath.id, lessonId: portLesson3.id, order: 4 },
  });
  await prisma.pathLesson.upsert({
    where: { pathId_lessonId: { pathId: portingPath.id, lessonId: portLesson4.id } },
    update: {},
    create: { pathId: portingPath.id, lessonId: portLesson4.id, order: 5 },
  });
  await prisma.pathLesson.upsert({
    where: { pathId_lessonId: { pathId: portingPath.id, lessonId: portLesson5.id } },
    update: {},
    create: { pathId: portingPath.id, lessonId: portLesson5.id, order: 6 },
  });
  await prisma.pathLesson.upsert({
    where: { pathId_lessonId: { pathId: portingPath.id, lessonId: portLesson6.id } },
    update: {},
    create: { pathId: portingPath.id, lessonId: portLesson6.id, order: 7 },
  });

  console.log("Created Platform Porting lessons (7 lessons)");

  // Create quiz questions
  await prisma.quizQuestion.upsert({
    where: { id: "quiz-1-q1" },
    update: {},
    create: {
      id: "quiz-1-q1",
      lessonId: lesson1.id,
      question: "What is the primary role of OpenBMC?",
      options: JSON.stringify([
        { text: "Web server management", isCorrect: false },
        { text: "Board Management Controller firmware", isCorrect: true },
        { text: "Database management", isCorrect: false },
        { text: "Container orchestration", isCorrect: false },
      ]),
      explanation:
        "OpenBMC is an open-source firmware for Board Management Controllers (BMCs), which are dedicated microcontrollers on server motherboards used for out-of-band management.",
      source: "MANUAL",
    },
  });

  await prisma.quizQuestion.upsert({
    where: { id: "quiz-1-q2" },
    update: {},
    create: {
      id: "quiz-1-q2",
      lessonId: lesson1.id,
      question: "Which build system does OpenBMC use?",
      options: JSON.stringify([
        { text: "Make", isCorrect: false },
        { text: "CMake", isCorrect: false },
        { text: "Yocto Project", isCorrect: true },
        { text: "Bazel", isCorrect: false },
      ]),
      explanation:
        "OpenBMC uses the Yocto Project, which is a Linux Foundation project that provides templates, tools, and methods to help create custom Linux-based systems.",
      source: "MANUAL",
    },
  });

  console.log("Created quiz questions");

  console.log("Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
