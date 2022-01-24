"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CopyEntryService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const contentfulExport = require("contentful-export");
const contentfulImport = require("contentful-import");
const fs_1 = require("fs");
const copy_entry_entity_1 = require("./copy-entry.entity");
let CopyEntryService = class CopyEntryService {
    constructor(copyEntryRepository) {
        this.copyEntryRepository = copyEntryRepository;
    }
    async performCopy(copyEntryDto) {
        try {
            const exportedIds = await this.export(copyEntryDto.export);
            for (const id of exportedIds) {
                await this.importContent(Object.assign(Object.assign({}, copyEntryDto.import), { entryId: id }));
                await this.updateCopyEntry({ entryId: id }, { imported: true });
            }
            await this.updateCopyEntry({ parentId: copyEntryDto.import.entryId }, { batchDone: true });
            return true;
        }
        catch (e) {
            console.log(e);
            return false;
        }
    }
    getLinkedEntryIds(fields) {
        const linkedEntryIds = [];
        for (const key of Object.keys(fields)) {
            let daKey;
            if ('da' in fields[key] && !!(daKey = fields[key].da)) {
                if (typeof daKey === 'object' && 'sys' in daKey) {
                    linkedEntryIds.push(daKey.sys.id);
                }
                if (Array.isArray(daKey)) {
                    daKey.forEach((item) => {
                        if ('sys' in item) {
                            linkedEntryIds.push(item.sys.id);
                        }
                    });
                }
            }
        }
        return linkedEntryIds;
    }
    async exportEntry(entryId, spaceId, environmentId, managementToken) {
        const result = await contentfulExport({
            spaceId,
            managementToken,
            environmentId,
            exportDir: 'exports',
            contentFile: `content-${entryId}.json`,
            contentOnly: true,
            includeDrafts: true,
            skipWebhooks: true,
            skipEditorInterfaces: true,
            useVerboseRenderer: true,
            queryEntries: [`sys.id[in]=${entryId}`],
        });
        return result.entries.length > 0
            ? this.getLinkedEntryIds(result.entries[0].fields)
            : [];
    }
    async export(sourceDto) {
        const { entryId, spaceId, environmentId, managementToken } = sourceDto;
        let exportedIds = [entryId];
        const runExportChildrenExport = async (linkedEntryIds) => {
            let childEntryIds = [];
            for (const id of linkedEntryIds) {
                if (!exportedIds.includes(id)) {
                    const ids = await this.exportEntry(id, spaceId, environmentId, managementToken);
                    await this.createCopyEntry(id, entryId);
                    exportedIds = [...new Set([id, ...exportedIds])];
                    childEntryIds = [...ids, ...childEntryIds];
                }
            }
            return childEntryIds;
        };
        let linkedEntryIds = await this.exportEntry(entryId, spaceId, environmentId, managementToken);
        do {
            linkedEntryIds = await runExportChildrenExport(linkedEntryIds);
        } while (linkedEntryIds.length > 0);
        return exportedIds;
    }
    async importContent(sourceDto) {
        const { entryId, spaceId, environmentId, managementToken } = sourceDto;
        const content = this.getSavedEntry(entryId);
        return await contentfulImport({
            spaceId,
            environmentId,
            managementToken,
            content,
            skipContentPublishing: true,
            skipEditorInterfaces: false,
        });
    }
    getSavedEntry(entryId) {
        let data = (0, fs_1.readFileSync)(`./exports/content-${entryId}.json`, {
            encoding: 'utf8',
            flag: 'r',
        });
        data = data.replace(/"da"/g, '"sv"').replace(/"en-US"/g, '"sv"');
        return JSON.parse(data);
    }
    async createCopyEntry(entryId, parentId) {
        const copyEntry = new copy_entry_entity_1.CopyEntry();
        copyEntry.entryId = entryId;
        copyEntry.parentId = parentId;
        await this.copyEntryRepository.save(copyEntry);
    }
    async updateCopyEntry(where, copyEntry) {
        await this.copyEntryRepository.update(where, copyEntry);
    }
    async checkCopyUpdate(entryId) {
        const entries = await this.copyEntryRepository.find({
            parentId: entryId,
            batchDone: false,
        });
        const total = entries.length;
        const processed = entries.reduce((sum, entry) => sum + +entry.imported, 0);
        return { total, processed };
    }
};
CopyEntryService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(copy_entry_entity_1.CopyEntry)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], CopyEntryService);
exports.CopyEntryService = CopyEntryService;
//# sourceMappingURL=copy-entry.service.js.map